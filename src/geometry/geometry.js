/**
 A **Geometry** defines a mesh for attached {{#crossLink "Entity"}}Entities{{/crossLink}}.

 ## Usage

 * [Geometry compression](#geometry-compression)
 * [Geometry batching](#geometry-batching)

 ### Geometry compression

 Geometries are automatically quantized to reduce memory and GPU bus usage. Usually, geometry attributes such as positions
 and normals are stored as 32-bit floating-point numbers. Quantization compresses those attributes to 16-bit integers
 represented on a scale between the minimum and maximum values. Decompression is then done on the GPU, via a simple
 matrix multiplication in the vertex shader.

 #### Disabling

 Since each normal vector is oct-encoded into two 8-bit unsigned integers, this can cause them to lose precision, which
 may affect the accuracy of any operations that rely on them being perfectly perpendicular to their surfaces. In such
 cases, you may need to disable compression for your geometries and models:

 ````javascript
 // Disable geometry compression when loading a Model
 var model = new xeogl.GLTFModel({
    src: "models/gltf/modern_office/scene.gltf",
    quantizeGeometry: false // Default is true
});

 // Disable compression when creating a Geometry
 var entity = new xeogl.Entity({
    geometry: new xeogl.TeapotGeometry({
        quantized: false // Default is true
    }),
    material: new xeogl.PhongMaterial({
        diffuse: [0.2, 0.2, 1.0]
    })
 });
 ````

 ### Geometry batching

 Geometries are automatically combined into the same vertex buffer objects (VBOs) so that we reduce the number of VBO
 binds done by WebGL on each frame. VBO binds are expensive, so this really makes a difference when we have large numbers
 of Entities that share similar Materials (as is often the case in CAD rendering).

 #### Disabling

 Since combined VBOs need to be rebuilt whenever we destroy a Geometry, we can disable this optimization for individual
 Models and Geometries when we know that we'll be continually creating and destroying them.

 ````javascript
 // Disable VBO combination for a GLTFModel
 var model = new xeogl.GLTFModel({
    src: "models/gltf/modern_office/scene.gltf",
    combinedGeometry: false // Default is true
});

 // Disable VBO combination for an individual Geometry
 var entity = new xeogl.Entity({
    geometry: new xeogl.TeapotGeometry({
        combined: false // Default is true
    }),
    material: new xeogl.PhongMaterial({
        diffuse: [0.2, 0.2, 1.0]
    })
 });
 ````

 @class Geometry
 @module xeogl
 @submodule geometry
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Geometry in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}},
 generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Geometry.
 @param [cfg.primitive="triangles"] {String} The primitive type. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
 @param [cfg.positions] {Array of Number} Positions array.
 @param [cfg.normals] {Array of Number} Vertex normal vectors array.
 @param [cfg.uv] {Array of Number} UVs array.
 @param [cfg.colors] {Array of Number} Vertex colors.
 @param [cfg.indices] {Array of Number} Indices array.
 @param [cfg.autoVertexNormals=false] {Boolean} Set true to automatically generate normal vectors from the positions and
 indices, if those are supplied.
 @param [cfg.quantized=true] {Boolean} Stores positions, colors, normals and UVs in quantized and oct-encoded formats
 for reduced memory footprint and GPU bus usage.
 @param [cfg.combined=false] {Boolean} Combines positions, colors, normals and UVs into the same WebGL vertex buffers
 with other Geometries, in order to reduce the number of buffer binds performed per frame.
 @param [cfg.ghostEdgeThreshold=2] {Number} When a {{#crossLink "Entity"}}{{/crossLink}} renders this Geometry as wireframe,
 this indicates the threshold angle (in degrees) between the face normals of adjacent triangles below which the edge is discarded.
 @extends Component
 */
(function () {

    "use strict";

    var memoryStats = xeogl.stats.memory;
    var bigIndicesSupported = xeogl.WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_element_index_uint"];
    var IndexArrayType = bigIndicesSupported ? Uint32Array : Uint16Array;
    var nullVertexBufs = new xeogl.renderer.VertexBufs({});

    var SceneVertexBufs = function (scene,
                                    hasPositions,
                                    hasNormals,
                                    hasColors,
                                    hasUVs,
                                    quantized) {

        const CHUNK_LEN = bigIndicesSupported ? (Number.MAX_SAFE_INTEGER / 6) : (64000 * 4); // RGBA is largest item

        var gl = scene.canvas.gl;
        var geometries = {};
        var geometryIndicesOffsets = {};
        var newGeometries = [];
        var geometryVertexBufs = {};
        var needRebuild = false;
        var needAppend = false;
        var positions = [];
        var normals = [];
        var colors = [];
        var uv = [];
        var vertexBufs = null;

        scene.canvas.on("webglContextRestored", build);

        this.addGeometry = function (geometry) {
            if (!geometry.positions || !geometry.indices) {
                scene.warn("Ignoring geometry with no positions or indices: " + geometry.id);
                return;
            }
            geometries[geometry.id] = geometry;
            geometryIndicesOffsets[geometry.id] = 0; // Will initialize below
            newGeometries.push(geometry);
            needAppend = true;
        };

        this.getIndicesOffset = function (geometry) {
            if (needRebuild || needAppend) {
                build();
            }
            return geometryIndicesOffsets[geometry.id];
        };

        this.getVertexBufs = function (geometry) {
            if (!geometries[geometry.id]) {
                return nullVertexBufs;
            }
            if (needRebuild || needAppend) {
                build();
            }
            return geometryVertexBufs[geometry.id];
        };

        this.setPositions = function (geometry) {
            var vertexBufs = geometryVertexBufs[geometry.id];
            if (!vertexBufs) {
                return;
            }
            if (!geometry.positions) {
                return;
            }
            var positionsBuf = vertexBufs.positionsBuf;
            if (!positionsBuf) {
                return;
            }
            positionsBuf.setData(geometry.positions, geometryIndicesOffsets[geometry.id] * 3);
        };

        this.setNormals = function (geometry) {
            var vertexBufs = geometryVertexBufs[geometry.id];
            if (!vertexBufs) {
                return;
            }
            if (!geometry.normals) {
                return;
            }
            var normalsBuf = vertexBufs.normalsBuf;
            if (!normalsBuf) {
                return;
            }
            normalsBuf.setData(geometry.normals, geometryIndicesOffsets[geometry.id] * 3);
        };

        this.setUVs = function (geometry) {
            var vertexBufs = geometryVertexBufs[geometry.id];
            if (!vertexBufs) {
                return;
            }
            if (!geometry.uv) {
                return;
            }
            var uvBuf = vertexBufs.uvBuf;
            if (!uvBuf) {
                return;
            }
            uvBuf.setData(geometry.uv, geometryIndicesOffsets[geometry.id] * 2);
        };

        this.setColors = function (geometry) {
            var vertexBufs = geometryVertexBufs[geometry.id];
            if (!vertexBufs) {
                return;
            }
            if (!geometry.color) {
                return;
            }
            var colorsBuf = vertexBufs.colorsBuf;
            if (!colorsBuf) {
                return;
            }
            colorsBuf.setData(geometry.colors, geometryIndicesOffsets[geometry.id] * 4);
        };

        this.removeGeometry = function (geometry) {
            var id = geometry.id;
            if (!geometries[id]) {
                return;
            }
            delete geometries[id];
            delete geometryIndicesOffsets[id];
            needRebuild = true;
        };

        function build() {

            geometryVertexBufs = {};

            var id;
            var geometry;
            var indicesOffset = 0;

            vertexBufs = null;

            for (id in geometries) {
                if (geometries.hasOwnProperty(id)) {

                    geometry = geometries[id];

                    var needNew = (!vertexBufs) || (positions.length + geometry.positions.length > CHUNK_LEN);

                    if (needNew) {
                        if (vertexBufs) {
                            createBufs(vertexBufs);
                        }
                        vertexBufs = new xeogl.renderer.VertexBufs({
                            positionsBuf: null,
                            normalsBuf: null,
                            uvBuf: null,
                            colorsBuf: null,
                            quantized: quantized
                        });
                        indicesOffset = 0;
                    }

                    geometryVertexBufs[id] = vertexBufs;

                    if (hasPositions) {
                        for (var i = 0, len = geometry.positions.length; i < len; i++) {
                            positions.push(geometry.positions[i]);
                        }
                    }

                    if (hasNormals) {
                        for (var i = 0, len = geometry.normals.length; i < len; i++) {
                            normals.push(geometry.normals[i]);
                        }
                    }

                    if (hasColors) {
                        for (var i = 0, len = geometry.colors.length; i < len; i++) {
                            colors.push(geometry.colors[i]);
                        }
                    }

                    if (hasUVs) {
                        for (var i = 0, len = geometry.uv.length; i < len; i++) {
                            uv.push(geometry.uv[i]);
                        }
                    }

                    // Adjust geometry indices

                    geometryIndicesOffsets[id] = indicesOffset;

                    var indices;

                    if (indicesOffset) {
                        indices = new (bigIndicesSupported ? Uint32Array : Uint16Array)(geometry.indices);
                        for (var i = 0, len = indices.length; i < len; i++) {
                            indices[i] += indicesOffset;
                            if (indices[i] > (CHUNK_LEN / 3)) {
                                console.error("out of range: " + indices[i])
                            }
                        }
                    } else {
                        indices = geometry.indices;
                    }

                    // Update indices buffer, lazy-create first if necessary

                    if (!geometry.indicesBufCombined) {
                        geometry.indicesBufCombined = new xeogl.renderer.ArrayBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, indices, indices.length, 1, gl.STATIC_DRAW);
                    } else {
                        geometry.indicesBufCombined.setData(indices);
                    }

                    indicesOffset += geometry.positions.length / 3;
                }
            }

            if (vertexBufs) {
                createBufs(vertexBufs);
            }

            needRebuild = false;
            needAppend = false;
        }

        function createBufs(vertexBufs) {
            var gl = scene.canvas.gl;
            var array;
            if (hasPositions) {
                array = quantized ? new Uint16Array(positions) : new Float32Array(positions);
                vertexBufs.positionsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, array, array.length, 3, gl.STATIC_DRAW);
                memoryStats.positions += vertexBufs.positionsBuf.numItems;
                positions = [];
            }
            if (hasNormals) {
                array = quantized ? new Int8Array(normals) : new Float32Array(normals);
                vertexBufs.normalsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, array, array.length, 3, gl.STATIC_DRAW);
                memoryStats.normals += vertexBufs.normalsBuf.numItems;
                normals = [];
            }
            if (hasColors) {
                array = new Float32Array(colors);
                vertexBufs.colorsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, array, array.length, 4, gl.STATIC_DRAW);
                memoryStats.colors += vertexBufs.colorsBuf.numItems;
                colors = [];
            }
            if (hasUVs) {
                array = quantized ? new Uint16Array(uv) : new Float32Array(uv);
                vertexBufs.uvBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, array, array.length, 2, gl.STATIC_DRAW);
                memoryStats.uvs += vertexBufs.uvBuf.numItems;
                uv = [];
            }
        }
    };

    function getSceneVertexBufs(scene, geometry) {
        var hasPositions = !!geometry.positions;
        var quantized = !!geometry.quantized;
        var hasNormals = !!geometry.normals;
        var hasColors = !!geometry.colors;
        var hasUVs = !!geometry.uv;
        var hash = ([
            hasPositions ? "p" : "",
            quantized ? "c" : "",
            hasNormals ? "n" : "",
            hasColors ? "c" : "",
            hasUVs ? "u" : ""
        ]).join(";");
        if (!scene._sceneVertexBufs) {
            scene._sceneVertexBufs = {};
        }
        var sceneVertexBufs = scene._sceneVertexBufs[hash];
        if (!sceneVertexBufs) {
            sceneVertexBufs = new SceneVertexBufs(
                scene,
                hasPositions,
                hasNormals,
                hasColors,
                hasUVs,
                quantized);
            scene._sceneVertexBufs[hash] = sceneVertexBufs;
        }
        return sceneVertexBufs;
    }

    xeogl.Geometry = xeogl.Component.extend({

        type: "xeogl.Geometry",

        _init: function (cfg) {

            var self = this;

            this._state = new xeogl.renderer.Geometry({

                combined: !!cfg.combined,
                quantized: !!cfg.quantized,
                autoVertexNormals: !!cfg.autoVertexNormals,

                primitive: null, // WebGL enum
                primitiveName: null, // String

                positions: null,    // Uint16Array when quantized == true, else Float32Array
                normals: null,      // Uint8Array when quantized == true, else Float32Array
                colors: null,
                uv: null,           // Uint8Array when quantized == true, else Float32Array
                indices: null,

                positionsDecodeMatrix: null, // Set when quantized == true
                uvDecodeMatrix: null, // Set when quantized == true

                positionsBuf: null,
                normalsBuf: null,
                colorsbuf: null,
                uvBuf: null,
                indicesBuf: null,
                indicesBufCombined: null, // Indices into a shared VertexBufs, set when combined == true

                hash: "",

                getGhostEdgesIndices: function () {
                    if (!self._edgesIndicesBuf) {
                        self._buildGhostEdgesIndices();
                    }
                    return self._edgesIndicesBuf;
                },

                getPickTrianglePositions: function () {
                    if (!self._pickTrianglePositionsBuf) {
                        self._buildPickTriangleVBOs();
                    }
                    return self._pickTrianglePositionsBuf;
                },

                getPickTriangleColors: function () {
                    if (!self._pickTriangleColorsBuf) {
                        self._buildPickTriangleVBOs();
                    }
                    return self._pickTriangleColorsBuf;
                },

                getPickVertexPositions: function () {
                    if (!self._pickVertexPositionsBuf) {
                        self._buildPickTriangleVBOs();
                    }
                    return self._pickVertexPositionsBuf;
                },

                getPickVertexColors: function () {
                    if (!self._pickVertexColorsBuf) {
                        self._buildPickTriangleVBOs();
                    }
                    return self._pickVertexColorsBuf;
                }
            });

            this._ghostEdgeThreshold = cfg.ghostEdgeThreshold || 2.0;

            // Lazy-generated VBOs

            this._edgesIndicesBuf = null;
            this._pickTrianglePositionsBuf = null;
            this._pickTriangleColorsBuf = null;

            // Local-space Boundary3D

            this._localBoundary = null;
            this._boundaryDirty = true;

            this._aabb = null;
            this._aabbDirty = true;

            this._obb = null;
            this._obbDirty = true;

            var state = this._state;
            var gl = this.scene.canvas.gl;

            // Primitive type

            cfg.primitive = cfg.primitive || "triangles";
            switch (cfg.primitive) {
                case "points":
                    state.primitive = gl.POINTS;
                    state.primitiveName = cfg.primitive;
                    break;
                case "lines":
                    state.primitive = gl.LINES;
                    state.primitiveName = cfg.primitive;
                    break;
                case "line-loop":
                    state.primitive = gl.LINE_LOOP;
                    state.primitiveName = cfg.primitive;
                    break;
                case "line-strip":
                    state.primitive = gl.LINE_STRIP;
                    state.primitiveName = cfg.primitive;
                    break;
                case "triangles":
                    state.primitive = gl.TRIANGLES;
                    state.primitiveName = cfg.primitive;
                    break;
                case "triangle-strip":
                    state.primitive = gl.TRIANGLE_STRIP;
                    state.primitiveName = cfg.primitive;
                    break;
                case "triangle-fan":
                    state.primitive = gl.TRIANGLE_FAN;
                    state.primitiveName = cfg.primitive;
                    break;
                default:
                    this.error("Unsupported value for 'primitive': '" + cfg.primitive +
                        "' - supported values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', " +
                        "'triangle-strip' and 'triangle-fan'. Defaulting to 'triangles'.");
                    state.primitive = gl.TRIANGLES;
                    state.primitiveName = cfg.primitive;
            }

            if (cfg.positions) {
                if (this._state.quantized) {
                    var bounds = getBounds(cfg.positions, 3);
                    var quantized = quantizeVec3(cfg.positions, bounds.min, bounds.max);
                    state.positions = quantized.quantized;
                    state.positionsDecodeMatrix = quantized.decode;
                } else {
                    state.positions = cfg.positions.constructor === Float32Array ? cfg.positions : new Float32Array(cfg.positions);
                }
            }
            if (cfg.colors) {
                state.colors = cfg.colors.constructor === Float32Array ? cfg.colors : new Float32Array(cfg.colors);
            }
            if (cfg.uv) {
                if (this._state.quantized) {
                    var bounds = getBounds(cfg.uv, 2);
                    var quantized = quantizeVec2(cfg.uv, bounds.min, bounds.max);
                    state.uv = quantized.quantized;
                    state.uvDecodeMatrix = quantized.decode;
                } else {
                    state.uv = cfg.uv.constructor === Float32Array ? cfg.uv : new Float32Array(cfg.uv);
                }
            }
            if (cfg.normals) {
                if (this._state.quantized) {
                    state.normals = octEncode(cfg.normals);
                } else {
                    state.normals = cfg.normals.constructor === Float32Array ? cfg.normals : new Float32Array(cfg.normals);
                }
            }
            if (cfg.indices) {
                if (!bigIndicesSupported && cfg.indices.constructor === Uint32Array) {
                    this.error("This WebGL implementation does not support Uint32Array");
                    return;
                }
                state.indices = (cfg.indices.constructor === Uint32Array || cfg.indices.constructor === Uint16Array) ? cfg.indices : new IndexArrayType(cfg.indices);
            }

            if (state.indices) {
                state.indicesBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, state.indices, state.indices.length, 1, gl.STATIC_DRAW);
                memoryStats.indices += state.indicesBuf.numItems;
            }

            this._buildVBOs();

            this._buildHash();

            this._webglContextRestored = this.scene.canvas.on("webglContextRestored", this._buildVBOs, this);

            memoryStats.meshes++;

            if (this._state.combined) {
                this._sceneVertexBufs = getSceneVertexBufs(this.scene, this._state);
                this._sceneVertexBufs.addGeometry(this._state);
            }

            self.fire("created", this.created = true);
        },

        _buildVBOs: function () {
            var state = this._state;
            var gl = this.scene.canvas.gl;
            if (state.indices) {
                state.indicesBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, state.indices, state.indices.length, 1, gl.STATIC_DRAW);
                memoryStats.indices += state.indicesBuf.numItems;
            }
            if (state.combined) {
                if (state.indices) {
                    // indicesBufCombined is created when VertexBufs are built for this Geometry
                }
            } else {
                if (state.positions) {
                    state.positionsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, state.positions, state.positions.length, 3, gl.STATIC_DRAW);
                    memoryStats.positions += state.positionsBuf.numItems;
                }
                if (state.normals) {
                    state.normalsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, state.normals, state.normals.length, 3, gl.STATIC_DRAW);
                    memoryStats.normals += state.normalsBuf.numItems;
                }
                if (state.colors) {
                    state.colorsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, state.colors, state.colors.length, 4, gl.STATIC_DRAW);
                    memoryStats.colors += state.colorsBuf.numItems;
                }
                if (state.uv) {
                    state.uvBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, state.uv, state.uv.length, 2, gl.STATIC_DRAW);
                    memoryStats.uvs += state.uvBuf.numItems;
                }
            }
        },

        _buildHash: function () {
            var state = this._state;
            var hash = ["/g"];
            hash.push("/" + state.primitive + ";");
            if (state.positions) {
                hash.push("p");
            }
            if (state.colors) {
                hash.push("c");
            }
            if (state.normals || state.autoVertexNormals) {
                hash.push("n");
            }
            if (state.uv) {
                hash.push("u");
            }
            if (state.quantized) {
                hash.push("cp");
            }
            hash.push(";");
            state.hash = hash.join("");
        },

        _buildGhostEdgesIndices: function () {
            var state = this._state;
            if (!state.positions || !state.indices) {
                return;
            }
            var gl = this.scene.canvas.gl;
            var indicesOffset = state.combined ? this._sceneVertexBufs.getIndicesOffset(state) : 0;
            var edgesIndices = buildEdgesIndices(state.positions, state.indices, state.positionsDecodeMatrix, indicesOffset, this._ghostEdgeThreshold);
            this._edgesIndicesBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, edgesIndices, edgesIndices.length, 1, gl.STATIC_DRAW);
            memoryStats.indices += this._edgesIndicesBuf.numItems;
        },

        _buildPickTriangleVBOs: function () { // Builds positions and indices arrays that allow each triangle to have a unique color
            var state = this._state;
            if (!state.positions || !state.indices) {
                return;
            }
            var gl = this.scene.canvas.gl;
            var arrays = xeogl.math.buildPickTriangles(state.positions, state.indices, state.quantized);
            var pickTrianglePositions = arrays.positions;
            var pickColors = arrays.colors;
            this._pickTrianglePositionsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, pickTrianglePositions, pickTrianglePositions.length, 3, gl.STATIC_DRAW);
            this._pickTriangleColorsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, pickColors, pickColors.length, 4, gl.STATIC_DRAW, true);
            memoryStats.positions += this._pickTrianglePositionsBuf.numItems;
            memoryStats.colors += this._pickTriangleColorsBuf.numItems;
        },

        _buildPickVertexVBOs: function () {
            // var state = this._state;
            // if (!state.positions || !state.indices) {
            //     return;
            // }
            // var gl = this.scene.canvas.gl;
            // var arrays = xeogl.math.buildPickVertices(state.positions, state.indices, state.quantized);
            // var pickVertexPositions = arrays.positions;
            // var pickColors = arrays.colors;
            // this._pickVertexPositionsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, pickVertexPositions, pickVertexPositions.length, 3, gl.STATIC_DRAW);
            // this._pickVertexColorsBuf = new xeogl.renderer.ArrayBuffer(gl, gl.ARRAY_BUFFER, pickColors, pickColors.length, 4, gl.STATIC_DRAW, true);
            // memoryStats.positions += this._pickVertexPositionsBuf.numItems;
            // memoryStats.colors += this._pickVertexColorsBuf.numItems;
        },


        _props: {

            /**
             The Geometry's primitive type.

             Valid types are: 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.

             @property primitive
             @default "triangles"
             @type String
             */
            primitive: {

                get: function () {
                    return this._state.primitiveName;
                }
            },

            /**
             Indicates if this Geometry is quantized.

             Compression is an internally-performed optimization which stores positions, colors, normals and UVs
             in quantized and oct-encoded formats for reduced memory footprint and GPU bus usage.

             Quantized geometry may not be updated.

             @property quantized
             @default false
             @type Boolean
             @final
             */
            quantized: {

                get: function () {
                    return this._state.quantized;
                }
            },

            /**
             Indicates if this Geometry is combined.

             Combination is an internally-performed optimization which combines positions, colors, normals and UVs into
             the same WebGL vertex buffers with other Geometries, in order to reduce the number of buffer binds
             performed per frame.

             @property combined
             @default false
             @type Boolean
             @final
             */
            combined: {

                get: function () {
                    return this._state.combined;
                }
            },


            /**
             The Geometry's vertex positions.

             @property positions
             @default null
             @type Float32Array
             */
            positions: {

                get: function () {
                    if (!this._state.positions) {
                        return;
                    }
                    if (!this._state.quantized) {
                        return this._state.positions;
                    }
                    if (!this._decompressedPositions) {
                        this._decompressedPositions = new Float32Array(this._state.positions.length);
                        xeogl.math.decompressPositions(this._state.positions, this._state.positionsDecodeMatrix, this._decompressedPositions);
                    }
                    return this._decompressedPositions;
                },

                set: function (newPositions) {
                    if (this._state.quantized) {
                        this.error("can't update geometry positions - quantized geometry is immutable"); // But will be eventually
                        return;
                    }
                    var state = this._state;
                    var positions = state.positions;
                    if (!positions) {
                        this.error("can't update geometry positions - geometry has no positions");
                        return;
                    }
                    if (positions.length !== newPositions.length) {
                        this.error("can't update geometry positions - new positions are wrong length");
                        return;
                    }
                    positions.set(newPositions);
                    if (state.positionsBuf) {
                        state.positionsBuf.setData(positions);
                    }
                    if (this._state.combined) {
                        this._sceneVertexBufs.setPositions(state);
                    }
                    this._setBoundaryDirty();
                    this._renderer.imageDirty();
                }
            },

            /**
             The Geometry's vertex normals.

             @property normals
             @default null
             @type Float32Array
             */
            normals: {

                get: function () {
                    if (!this._state.normals) {
                        return;
                    }
                    if (!this._state.quantized) {
                        return this._state.normals;
                    }
                    if (!this._decompressedNormals) {
                        var lenCompressed = this._state.normals.length;
                        var lenDecompressed = lenCompressed + (lenCompressed / 2); // 2 -> 3
                        this._decompressedNormals = new Float32Array(lenDecompressed);
                        xeogl.math.octDecodeVec2s(this._state.normals, this._decompressedNormals);
                    }
                    return this._decompressedNormals;
                },

                set: function (newNormals) {
                    if (this._state.quantized) {
                        this.error("can't update geometry normals - quantized geometry is immutable"); // But will be eventually
                        return;
                    }
                    var state = this._state;
                    var normals = state.normals;
                    if (!normals) {
                        this.error("can't update geometry normals - geometry has no normals");
                        return;
                    }
                    if (normals.length !== newNormals.length) {
                        this.error("can't update geometry normals - new normals are wrong length");
                        return;
                    }
                    normals.set(newNormals);
                    if (state.normalsBuf) {
                        state.normalsBuf.setData(normals);
                    }
                    if (this._state.combined) {
                        this._sceneVertexBufs.setNormals(state);
                    }
                    this._renderer.imageDirty();
                }
            },

            /**
             The Geometry's UV coordinates.

             @property uv
             @default null
             @type Float32Array
             */
            uv: {

                get: function () {
                    if (!this._state.uv) {
                        return;
                    }
                    if (!this._state.quantized) {
                        return this._state.uv;
                    }
                    if (!this._decompressedUV) {
                        this._decompressedUV = new Float32Array(this._state.uv.length);
                        xeogl.math.decompressUVs(this._state.uv, this._state.uvDecodeMatrix, this._decompressedUV);
                    }
                    return this._decompressedUV;
                },

                set: function (newUV) {
                    if (this._state.quantized) {
                        this.error("can't update geometry UVs - quantized geometry is immutable"); // But will be eventually
                        return;
                    }
                    var state = this._state;
                    var uv = state.uv;
                    if (!uv) {
                        this.error("can't update geometry UVs - geometry has no UVs");
                        return;
                    }
                    if (uv.length !== newUV.length) {
                        this.error("can't update geometry UVs - new UVs are wrong length");
                        return;
                    }
                    uv.set(newUV);
                    if (state.uvBuf) {
                        state.uvBuf.setData(uv);
                    }
                    if (this._state.combined) {
                        this._sceneVertexBufs.setUVs(state);
                    }
                    this._renderer.imageDirty();
                }
            },

            /**
             The Geometry's vertex colors.

             @property colors
             @default null
             @type Float32Array
             */
            colors: {

                get: function () {
                    return this._state.colors;
                },

                set: function (newColors) {
                    if (this._state.quantized) {
                        this.error("can't update geometry colors - quantized geometry is immutable"); // But will be eventually
                        return;
                    }
                    var state = this._state;
                    var colors = state.colors;
                    if (!colors) {
                        this.error("can't update geometry colors - geometry has no colors");
                        return;
                    }
                    if (colors.length !== newColors.length) {
                        this.error("can't update geometry colors - new colors are wrong length");
                        return;
                    }
                    colors.set(newColors);
                    if (state.colorsBuf) {
                        state.colorsBuf.setData(colors);
                    }
                    if (this._state.combined) {
                        this._sceneVertexBufs.setColors(state);
                    }
                    this._renderer.imageDirty();
                }
            },

            /**
             The Geometry's indices.

             If ````xeogl.WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_element_index_uint"]```` is true, then this can be
             a ````Uint32Array````, otherwise it needs to be a ````Uint16Array````.

             @property indices
             @default null
             @type Uint16Array | Uint32Array
             @final
             */
            indices: {
                get: function () {
                    return this._state.indices;
                }
            },

            /**
             * Local-space axis-aligned 3D boundary (AABB) of this geometry.
             *
             * The AABB is represented by a six-element Float32Array containing the min/max extents of the
             * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
             *
             * @property aabb
             * @final
             * @type {Float32Array}
             */
            aabb: {
                get: function () {
                    if (this._aabbDirty) {
                        if (!this._aabb) {
                            this._aabb = xeogl.math.AABB3();
                        }
                        xeogl.math.positions3ToAABB3(this._state.positions, this._aabb, this._state.positionsDecodeMatrix);
                        this._aabbDirty = false;
                    }
                    return this._aabb;
                }
            },

            /**
             * Local-space oriented 3D boundary (OBB) of this geometry.
             *
             * The OBB is represented by a 32-element Float32Array containing the eight vertices of the box,
             * where each vertex is a homogeneous coordinate having [x,y,z,w] elements.
             *
             * @property obb
             * @final
             * @type {Float32Array}
             */
            obb: {
                get: (function () {
                    var aabb = xeogl.math.AABB3();
                    return function () {
                        if (this._obbDirty) {
                            if (!this._obb) {
                                this._obb = xeogl.math.OBB3();
                            }
                            xeogl.math.positions3ToAABB3(this._state.positions, aabb, this._state.positionsDecodeMatrix);
                            xeogl.math.AABB3ToOBB3(aabb, this._obb);
                            this._obbDirty = false;
                        }
                        return this._obb;
                    };
                })()
            },

            kdtree: {
                get: function () {
                    var state = this._state;
                    if (!state.indices || !state.positions) {
                        this.error("Can't provide a KD-tree: no indices/positions");
                        return;
                    }
                    if (!this._kdtree) {
                        this._kdtree = xeogl.math.buildKDTree(state.indices, state.positions, this._state.positionsDecodeMatrix);
                    }
                    return this._kdtree;
                }
            }
        },

        _setBoundaryDirty: function () {
            if (this._boundaryDirty) {
                return;
            }
            this._boundaryDirty = true;
            this._aabbDirty = true;
            this._obbDirty = true;
            if (this._localBoundary) {
                this._localBoundary.fire("updated", true);
            }

            /**
             Fired whenever this Geometry's boundary changes.

             Get the latest boundary from the Geometry's {{#crossLink "Geometry/aabb:property"}}{{/crossLink}}
             and {{#crossLink "Geometry/obb:property"}}{{/crossLink}} properties.

             @event boundary

             */
            this.fire("boundary");
        },

        _getState: function () {
            return this._state;
        },

        _getVertexBufs: function () {
            return this._state && this._state.combined ? this._sceneVertexBufs.getVertexBufs(this._state) : nullVertexBufs;
        },

        _destroy: function () {

            this.scene.canvas.off(this._webglContextRestored);
            var state = this._state;

            if (state.indicesBuf) {
                state.indicesBuf.destroy();
            }

            if (this._edgesIndicesBuf) {
                this._edgesIndicesBuf.destroy();
            }

            if (state.indicesBufCombined) {
                state.indicesBufCombined.destroy();
            }

            if (this._pickTrianglePositionsBuf) {
                this._pickTrianglePositionsBuf.destroy();
            }

            if (this._pickTriangleColorsBuf) {
                this._pickTriangleColorsBuf.destroy();
            }

            if (this._pickVertexPositionsBuf) {
                this._pickVertexPositionsBuf.destroy();
            }

            if (this._pickVertexColorsBuf) {
                this._pickVertexColorsBuf.destroy();
            }

            if (this._localBoundary) {
                this._localBoundary.destroy();
            }

            if (this._state.combined) {
                this._sceneVertexBufs.removeGeometry(state);
            }

            state.destroy();

            memoryStats.meshes--;
        }
    });

    function getBounds(array, stride) {
        var min = new Float32Array(stride);
        var max = new Float32Array(stride);
        var i, j;
        for (i = 0; i < stride; i++) {
            min[i] = Number.MAX_VALUE;
            max[i] = -Number.MAX_VALUE;
        }
        for (i = 0; i < array.length; i += stride) {
            for (j = 0; j < stride; j++) {
                min[j] = Math.min(min[j], array[i + j]);
                max[j] = Math.max(max[j], array[i + j]);
            }
        }
        return {
            min: min,
            max: max
        };
    }

    var quantizeVec3 = (function () {
        var math = xeogl.math;
        var translate = math.mat4();
        var scale = math.mat4();
        return function (array, min, max) {
            var quantized = new Uint16Array(array.length);
            var multiplier = new Float32Array([
                65535 / (max[0] - min[0]),
                65535 / (max[1] - min[1]),
                65535 / (max[2] - min[2])
            ]);
            var i;
            for (i = 0; i < array.length; i += 3) {
                quantized[i + 0] = Math.floor((array[i + 0] - min[0]) * multiplier[0]);
                quantized[i + 1] = Math.floor((array[i + 1] - min[1]) * multiplier[1]);
                quantized[i + 2] = Math.floor((array[i + 2] - min[2]) * multiplier[2]);
            }
            math.identityMat4(translate);
            math.translationMat4v(min, translate);
            math.identityMat4(scale);
            math.scalingMat4v([
                (max[0] - min[0]) / 65535,
                (max[1] - min[1]) / 65535,
                (max[2] - min[2]) / 65535
            ], scale);
            var decodeMat = math.mulMat4(translate, scale, math.identityMat4());
            return {
                quantized: quantized,
                decode: decodeMat
            };
        }
    })();

    var quantizeVec2 = (function () {
        var math = xeogl.math;
        var translate = math.mat3();
        var scale = math.mat3();
        return function (array, min, max) {
            var quantized = new Uint16Array(array.length);
            var multiplier = new Float32Array([
                65535 / (max[0] - min[0]),
                65535 / (max[1] - min[1])
            ]);
            var i;
            for (i = 0; i < array.length; i += 2) {
                quantized[i + 0] = Math.floor((array[i + 0] - min[0]) * multiplier[0]);
                quantized[i + 1] = Math.floor((array[i + 1] - min[1]) * multiplier[1]);
            }
            math.identityMat3(translate);
            math.translationMat3v(min, translate);
            math.identityMat3(scale);
            math.scalingMat3v([
                (max[0] - min[0]) / 65535,
                (max[1] - min[1]) / 65535
            ], scale);
            var decodeMat = math.mulMat3(translate, scale, math.identityMat3());
            return {
                quantized: quantized,
                decode: decodeMat
            };
        };
    })();

    function octEncode(array) {
        var encoded = new Int8Array(array.length * 2 / 3);
        var oct, dec, best, currentCos, bestCos;
        var i, ei;
        for (i = 0, ei = 0; i < array.length; i += 3, ei += 2) {
            // Test various combinations of ceil and floor
            // to minimize rounding errors
            best = oct = octEncodeVec3(array, i, "floor", "floor");
            dec = octDecodeVec2(oct);
            currentCos = bestCos = dot(array, i, dec);
            oct = octEncodeVec3(array, i, "ceil", "floor");
            dec = octDecodeVec2(oct);
            currentCos = dot(array, i, dec);
            if (currentCos > bestCos) {
                best = oct;
                bestCos = currentCos;
            }
            oct = octEncodeVec3(array, i, "floor", "ceil");
            dec = octDecodeVec2(oct);
            currentCos = dot(array, i, dec);
            if (currentCos > bestCos) {
                best = oct;
                bestCos = currentCos;
            }
            oct = octEncodeVec3(array, i, "ceil", "ceil");
            dec = octDecodeVec2(oct);
            currentCos = dot(array, i, dec);
            if (currentCos > bestCos) {
                best = oct;
                bestCos = currentCos;
            }
            encoded[ei] = best[0];
            encoded[ei + 1] = best[1];
        }
        return encoded;
    }

    // Oct-encode single normal vector in 2 bytes
    function octEncodeVec3(array, i, xfunc, yfunc) {
        var x = array[i] / (Math.abs(array[i]) + Math.abs(array[i + 1]) + Math.abs(array[i + 2]));
        var y = array[i + 1] / (Math.abs(array[i]) + Math.abs(array[i + 1]) + Math.abs(array[i + 2]));
        if (array[i + 2] < 0) {
            var tempx = x;
            var tempy = y;
            tempx = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
            tempy = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
            x = tempx;
            y = tempy;
        }
        return new Int8Array([
            Math[xfunc](x * 127.5 + (x < 0 ? -1 : 0)),
            Math[yfunc](y * 127.5 + (y < 0 ? -1 : 0))
        ]);
    }

    // Decode an oct-encoded normal
    function octDecodeVec2(oct) {
        var x = oct[0];
        var y = oct[1];
        x /= x < 0 ? 127 : 128;
        y /= y < 0 ? 127 : 128;
        var z = 1 - Math.abs(x) - Math.abs(y);
        if (z < 0) {
            x = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
            y = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
        }
        var length = Math.sqrt(x * x + y * y + z * z);
        return [
            x / length,
            y / length,
            z / length
        ];
    }

    // Dot product of a normal in an array against a candidate decoding
    function dot(array, i, vec3) {
        return array[i] * vec3[0] + array[i + 1] * vec3[1] + array[i + 2] * vec3[2];
    }

    /*
     * Checks for duplicate vertices with hashmap.
     * Duplicated vertices are removed
     * and faces' vertices are updated.
     */

    // Should return { positions:  newPositions, indices: newIndices };
    var mergeVertices = function (positions, indices) {

        var verticesMap = {}; // Hashmap for looking up vertices by position coordinates (and making sure they are unique)
        var unique = [], changes = [];

        var v, key;
        var precisionPoints = 4; // number of decimal points, e.g. 4 for epsilon of 0.0001
        var precision = Math.pow(10, precisionPoints);
        var i, il, face;
        var indices, j, jl;

        for (i = 0, il = this.vertices.length; i < il; i++) {

            v = this.vertices[i];
            key = Math.round(v.x * precision) + '_' + Math.round(v.y * precision) + '_' + Math.round(v.z * precision);

            if (verticesMap[key] === undefined) {

                verticesMap[key] = i;
                unique.push(this.vertices[i]);
                changes[i] = unique.length - 1;

            } else {

                //console.log('Duplicate vertex found. ', i, ' could be using ', verticesMap[key]);
                changes[i] = changes[verticesMap[key]];
            }
        }

        // if faces are completely degenerate after merging vertices, we
        // have to remove them from the geometry.
        var faceIndicesToRemove = [];

        for (i = 0, il = this.faces.length; i < il; i++) {

            face = this.faces[i];

            face.a = changes[face.a];
            face.b = changes[face.b];
            face.c = changes[face.c];

            indices = [face.a, face.b, face.c];

            // if any duplicate vertices are found in a Face3
            // we have to remove the face as nothing can be saved
            for (var n = 0; n < 3; n++) {
                if (indices[n] === indices[( n + 1 ) % 3]) {
                    faceIndicesToRemove.push(i);
                    break;
                }
            }
        }

        for (i = faceIndicesToRemove.length - 1; i >= 0; i--) {
            var idx = faceIndicesToRemove[i];
            this.faces.splice(idx, 1);
            for (j = 0, jl = this.faceVertexUvs.length; j < jl; j++) {
                this.faceVertexUvs[j].splice(idx, 1);
            }
        }

        // Use unique set of vertices

        var diff = this.vertices.length - unique.length;
        this.vertices = unique;
        return diff;
    };


    var buildEdgesIndices = (function () {

        var math = xeogl.math;

        var faces = [];
        var numFaces = 0;
        var compa = new Uint16Array(3);
        var compb = new Uint16Array(3);
        var compc = new Uint16Array(3);
        var a = math.vec3();
        var b = math.vec3();
        var c = math.vec3();
        var cb = math.vec3();
        var ab = math.vec3();
        var cross = math.vec3();
        var normal = math.vec3();

        function buildFaces(positions, indices, positionsDecodeMatrix) {

            numFaces = 0;

            for (var i = 0, len = indices.length; i < len; i += 3) {

                var ia = ((indices[i + 0]) * 3);
                var ib = ((indices[i + 1]) * 3);
                var ic = ((indices[i + 2]) * 3);

                if (positionsDecodeMatrix) {

                    compa[0] = positions[ia];
                    compa[1] = positions[ia + 1];
                    compa[2] = positions[ia + 2];

                    compb[0] = positions[ib];
                    compb[1] = positions[ib + 1];
                    compb[2] = positions[ib + 2];

                    compc[0] = positions[ic];
                    compc[1] = positions[ic + 1];
                    compc[2] = positions[ic + 2];

                    // Decode

                    math.decompressPosition(compa, positionsDecodeMatrix, a);
                    math.decompressPosition(compb, positionsDecodeMatrix, b);
                    math.decompressPosition(compc, positionsDecodeMatrix, c);

                } else {

                    a[0] = positions[ia];
                    a[1] = positions[ia + 1];
                    a[2] = positions[ia + 2];

                    b[0] = positions[ib];
                    b[1] = positions[ib + 1];
                    b[2] = positions[ib + 2];

                    c[0] = positions[ic];
                    c[1] = positions[ic + 1];
                    c[2] = positions[ic + 2];
                }

                math.subVec3(c, b, cb);
                math.subVec3(a, b, ab);
                math.cross3Vec3(cb, ab, cross);
                math.normalizeVec3(cross, normal);

                var face = faces[numFaces] || (faces[numFaces] = {normal: math.vec3()});

                face.normal[0] = normal[0];
                face.normal[1] = normal[1];
                face.normal[2] = normal[2];

                numFaces++;
            }
        }

        return function (positions, indices, positionsDecodeMatrix, indicesOffset, ghostEdgeThreshold) {

            var math = xeogl.math;

            buildFaces(positions, indices, positionsDecodeMatrix);

            var edgeIndices = [];
            var thresholdDot = Math.cos(xeogl.math.DEGTORAD * ghostEdgeThreshold);
            var edges = {};
            var edge1;
            var edge2;
            var index1;
            var index2;
            var key;

            var a = math.vec3();
            var b = math.vec3();

            for (var i = 0, len = indices.length; i < len; i += 3) {

                var faceIndex = i / 3;

                for (var j = 0; j < 3; j++) {

                    edge1 = indices[i + j];
                    edge2 = indices[i + ((j + 1) % 3)];

                    index1 = Math.min(edge1, edge2);
                    index2 = Math.max(edge1, edge2);

                    key = index1 + "," + index2;

                    if (edges[key] === undefined) {
                        edges[key] = {
                            index1: index1,
                            index2: index2,
                            face1: faceIndex,
                            face2: undefined
                        };
                    } else {
                        edges[key].face2 = faceIndex;
                    }
                }
            }

            var largeIndex = false;

            for (key in edges) {

                var e = edges[key];

                // an edge is only rendered if the angle (in degrees) between the face normals of the adjoining faces exceeds this value. default = 1 degree.

                if (e.face2 !== undefined) {

                    var normal1 = faces[e.face1].normal;
                    var normal2 = faces[e.face2].normal;

                    var dot = math.dotVec3(normal1, normal2);

                    if (dot > thresholdDot) {
                        continue;
                    }
                }

                var ia = e.index1 + indicesOffset;
                var ib = e.index2 + indicesOffset;

                if (!largeIndex && ia > 65535 || ib > 65535) {
                    largeIndex = true;
                }

                edgeIndices.push(ia);
                edgeIndices.push(ib);
            }

            return largeIndex ? new Uint32Array(edgeIndices) : new Uint16Array(edgeIndices);
        }
    })();
})();