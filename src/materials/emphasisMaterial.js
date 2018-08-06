/**
 An **EmphasisMaterial** is a {{#crossLink "Material"}}{{/crossLink}} that defines the appearance of attached
 {{#crossLink "Entity"}}Entities{{/crossLink}} when they are highlighted, selected or ghosted.

 ## Examples

 | <a href="../../examples/#effects_ghost"><img src="../../assets/images/screenshots/HighlightMaterial/teapot.png"></img></a> | <a href="../../examples/#effects_demo_housePlan"><img src="../../assets/images/screenshots/HighlightMaterial/house.png"></img></a> | <a href="../../examples/#effects_demo_gearbox"><img src="../../assets/images/screenshots/HighlightMaterial/gearbox.png"></img></a> | <a href="../../examples/#effects_demo_adam"><img src="../../assets/images/screenshots/HighlightMaterial/adam.png"></img></a>|
 |:------:|:------:|:----:|:-----:|:-----:|
 |[Example 1: Ghost effect](../../examples/#effects_ghost)|[Example 2: Ghost and highlight effects for architecture](../../examples/#effects_demo_housePlan)|[Example 3: Ghost and highlight effects for CAD](../../examples/#effects_demo_gearbox)| [Example 4: Ghost effect for CAD ](../../examples//#effects_demo_adam)|

 ## Overview

 * Ghost an {{#crossLink "Entity"}}{{/crossLink}} by setting its {{#crossLink "Entity/ghost:property"}}{{/crossLink}} property ````true````.
 * When ghosted, an Entity's appearance is controlled by its EmphasisMaterial.
 * An EmphasisMaterial provides several preset configurations that you can set it to. Select a preset by setting {{#crossLink "EmphasisMaterial/preset:property"}}{{/crossLink}} to the preset's ID. A map of available presets is provided in {{#crossLink "EmphasisMaterial/presets:property"}}xeogl.EmphasisMaterial.presets{{/crossLink}}.
 * By default, an Entity uses the {{#crossLink "Scene"}}{{/crossLink}}'s global EmphasisMaterials, but you can give each Entity its own EmphasisMaterial when you want to customize the effect per-Entity.
 * Ghost all Entities in a {{#crossLink "Model"}}{{/crossLink}} by setting the Model's {{#crossLink "Model/ghost:property"}}{{/crossLink}} property ````true````. Note that all Entities in a Model have the Scene's global EmphasisMaterial by default.
 * Modify the Scene's global EmphasisMaterial to customize it.

 ## Usage

 * [Ghosting](#ghosting)
 * [Highlighting](#highlighting)

 ### Ghosting

 In the usage example below, we'll create an Entity with a ghost effect applied to it. The Entity gets its own EmphasisMaterial for ghosting, and
 has its {{#crossLink "Entity/ghost:property"}}{{/crossLink}} property set ````true```` to activate the effect.

 <a href="../../examples/#effects_ghost"><img src="../../assets/images/screenshots/HighlightMaterial/teapot.png"></img></a>

 ````javascript
 var entity = new xeogl.Entity({
    geometry: new xeogl.TeapotGeometry({
        ghostEdgeThreshold: 1
    }),
    material: new xeogl.PhongMaterial({
        diffuse: [0.2, 0.2, 1.0]
    }),
    ghostMaterial: new xeogl.EmphasisMaterial({
        edges: true,
        edgeColor: [0.2, 1.0, 0.2],
        edgeAlpha: 1.0,
        edgeWidth: 2,
        vertices: true,
        vertexColor: [0.6, 1.0, 0.6],
        vertexAlpha: 1.0,
        vertexSize: 8,
        fill: true,
        fillColor: [0, 0, 0],
        fillAlpha: 0.7
    }),
    ghost: true
 });
 ````

 Note the **ghostEdgeThreshold** configuration on the {{#crossLink "Geometry"}}{{/crossLink}} we've created for our
 Entity. Our EmphasisMaterial is configured to draw a wireframe representation of the Geometry, which will have inner edges (ie. edges between
 adjacent co-planar triangles) removed for visual clarity. The ````ghostEdgeThreshold```` configuration indicates
 that, for this particular Geometry, an inner edge is one where the angle between the surface normals of adjacent triangles is not
 greater than ````5```` degrees. That's set to ````2```` by default, but we can override it to tweak the effect as needed for particular Geometries.

 Here's the example again, this time using the Scene's global EmphasisMaterial by default. We'll also modify that EmphasisMaterial
 to customize the effect.

 ````javascript
 var entity = new xeogl.Entity({
    geometry: new xeogl.TeapotGeometry({
        ghostEdgeThreshold: 5
    }),
    material: new xeogl.PhongMaterial({
        diffuse: [0.2, 0.2, 1.0]
    }),
    ghost: true
 });

 var ghostMaterial = entity.scene.ghostMaterial;

 ghostMaterial.edges = true;
 ghostMaterial.edgeColor = [0.2, 1.0, 0.2];
 ghostMaterial.edgeAlpha = 1.0;
 ghostMaterial.edgeWidth = 2;
 ghostMaterial.vertices = true;
 ghostMaterial.vertexColor = [0.6, 1.0, 0.6];
 ghostMaterial.vertexAlpha = 1.0;
 ghostMaterial.vertexSize = 8;
 ghostMaterial.fill = true;
 ghostMaterial.fillColor = [0, 0, 0];
 ghostMaterial.fillAlpha = 0.7;
 ````

 ### Highlighting

 In the next example, we'll use a ghosting in conjunction with highlighting, to emphasise a couple of objects within
 a gearbox {{#crossLink "Model"}}{{/crossLink}}. We'll load the Model from glTF, then ghost all of its Entities except for two gears, which we'll highlight instead. The ghosted
 Entities have the Scene's global ghosting EmphasisMaterial, which we'll modify. The  highlighted Entities also have the Scene's global highlighting EmphasisMaterial, which we'll modify as well.

 <a href="../../examples/#effects_demo_gearbox"><img src="../../assets/images/screenshots/HighlightMaterial/gearbox.png"></img></a>

 ````javascript
 var model = new xeogl.GLTFModel({
     src: "models/gltf/gearbox_conical/scene.gltf",
     ghostEdgeThreshold: 10
 });

 model.on("loaded", function() {

    model.ghost = true;

    model.entities["gearbox#77.0"].ghost = false;
    model.entities["gearbox#79.0"].ghost = false;

    model.entities["gearbox#77.0"].highlight = true;
    model.entities["gearbox#79.0"].highlight = true;

    var ghostMaterial = model.scene.ghostMaterial;

    ghostMaterial.edges = true;
    ghostMaterial.edgeColor = [0.4, 0.4, 1.6];
    ghostMaterial.edgeAlpha = 0.8;
    ghostMaterial.edgeWidth = 3;
    ghostMaterial.vertices = false;
    ghostMaterial.vertexColor = [0.7, 1.0, 0.7];
    ghostMaterial.vertexAlpha = 0.9;
    ghostMaterial.vertexSize = 4.0;
    ghostMaterial.fill = true;
    ghostMaterial.fillColor = [0.2, 0.2, 0.7];
    ghostMaterial.fillAlpha = 0.9;

    var highlightMaterial = model.scene.highlightMaterial;

    highlightMaterial.color = [1.0, 1.0, 1.0];
    highlightMaterial.alpha = 1.0;
 });
 ````

 ## Presets

 For convenience, an EmphasisMaterial provides several preset configurations that you can set it to, which are provided in
 {{#crossLink "EmphasisMaterial/presets:property"}}xeogl.EmphasisMaterial.presets{{/crossLink}}:

 ````javascript
 var presets = xeogl.EmphasisMaterial.presets;
 ````

 The presets look something like this:

 ````json
 {
        "default": {
            edges: true,
            edgeColor: [0.2, 0.2, 0.2],
            edgeAlpha: 0.5,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2
        },

         "sepia": {
            edges: true,
            edgeColor: [0.52, 0.45, 0.41],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.7, 1.0, 0.7],
            vertexAlpha: 0.9,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.97, 0.79, 0.66],
            fillAlpha: 0.4
        },

        //...
 }
 ````

 Let's switch the Scene's global default  EmphasisMaterial over to the "sepia" preset used in <a href="/examples/#effects_demo_adam">Example 4: Ghost effect for CAD</a>.

 ````javascript
 scene.ghostMaterial.preset = "sepia";
 ````

 You can also just create an EmphasisMaterial from a preset:

 ````javascript
 var entity = new xeogl.Entity({
    geometry: new xeogl.TeapotGeometry({
        ghostEdgeThreshold: 5
    }),
    material: new xeogl.PhongMaterial({
        diffuse: [0.2, 0.2, 1.0]
    }),
    ghostMaterial: new xeogl.EmphasisMaterial({
        preset: "sepia"
    });
    ghost: true
 });
 ````

 Note that applying a preset just sets the EmphasisMaterial's property values, which you are then free to modify afterwards.

 @class EmphasisMaterial
 @module xeogl
 @submodule materials
 @constructor
 @extends Material
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this EmphasisMaterial within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted
 @param [cfg] {*} The EmphasisMaterial configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta=null] {String:Object} Metadata to attach to this EmphasisMaterial.

 @param [cfg.edges=true] {Boolean} Indicates whether or not ghost edges are visible.
 @param [cfg.edgeColor=[0.2,0.2,0.2]] {Array of Number}  RGB color of ghost edges.
 @param [cfg.edgeAlpha=0.5] {Number} Transparency of ghost edges. A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
 @param [cfg.edgeWidth=1] {Number}  Width of ghost edges, in pixels.

 @param [cfg.vertices=false] {Boolean} Indicates whether or not ghost vertices are visible.
 @param [cfg.vertexColor=[0.4,0.4,0.4]] {Array of Number} Color of ghost vertices.
 @param [cfg.vertexAlpha=0.7] {Number}  Transparency of ghost vertices. A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
 @param [cfg.vertexSize=4.0] {Number} Pixel size of ghost vertices.

 @param [cfg.fill=true] {Boolean} Indicates whether or not ghost surfaces are filled with color.
 @param [cfg.fillColor=[0.4,0.4,0.4]] {Array of Number} EmphasisMaterial fill color.
 @param [cfg.fillAlpha=0.2] {Number}  Transparency of filled ghost faces. A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

 @param [cfg.preset] {String} Selects a preset EmphasisMaterial configuration - see {{#crossLink "EmphasisMaterial/preset:method"}}preset(){{/crossLink}}.
 */
(function () {

    "use strict";

    xeogl.EmphasisMaterial = xeogl.Material.extend({

        type: "xeogl.EmphasisMaterial",

        _init: function (cfg) {

            this._super(cfg);

            this._state = new xeogl.renderer.EmphasisMaterial({

                type: "EmphasisMaterial",

                edges: null,
                edgeColor: null,
                edgeAlpha: null,
                edgeWidth: null,

                vertices: null,
                vertexColor: null,
                vertexAlpha: null,
                vertexSize: null,

                fill: null,
                fillColor: null,
                fillAlpha: null
            });

            this._preset = "default";

            if (cfg.preset) {

                this.preset = cfg.preset;

                if (cfg.edges !== undefined) this.edges = cfg.edges;
                if (cfg.edgeColor)  this.edgeColor = cfg.edgeColor;
                if (cfg.edgeAlpha !== undefined) this.edgeAlpha = cfg.edgeAlpha;
                if (cfg.edgeWidth !== undefined) this.edgeWidth = cfg.edgeWidth;
                if (cfg.vertices !== undefined) this.vertices = cfg.vertices;
                if (cfg.vertexColor) this.vertexColor = cfg.vertexColor;
                if (cfg.vertexAlpha !== undefined) this.vertexAlpha = cfg.vertexAlpha;
                if (cfg.vertexSize) this.vertexSize = cfg.vertexSize;
                if (cfg.fill !== undefined) this.fill = cfg.fill;
                if (cfg.fillColor) this.fillColor = cfg.fillColor;
                if (cfg.fillAlpha !== undefined) this.fillAlpha = cfg.fillAlpha;
            } else {
                this.edges = cfg.edges;
                this.edgeColor = cfg.edgeColor;
                this.edgeAlpha = cfg.edgeAlpha;
                this.edgeWidth = cfg.edgeWidth;
                this.vertices = cfg.vertices;
                this.vertexColor = cfg.vertexColor;
                this.vertexAlpha = cfg.vertexAlpha;
                this.vertexSize = cfg.vertexSize;
                this.fill = cfg.fill;
                this.fillColor = cfg.fillColor;
                this.fillAlpha = cfg.fillAlpha;
            }
        },

        _props: {

            /**
             Indicates whether or not ghost edges are visible.

             @property edges
             @default true
             @type Boolean
             */
            edges: {

                set: function (value) {
                    value = value !== false;
                    if (this._state.edges === value) {
                        return;
                    }
                    this._state.edges = value;
                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.edges;
                }
            },

            /**
             RGB color of ghost edges.

             @property edgeColor
             @default [0.2, 0.2, 0.2]
             @type Float32Array
             */
            edgeColor: {

                set: function (value) {

                    var edgeColor = this._state.edgeColor;

                    if (!edgeColor) {
                        edgeColor = this._state.edgeColor = new Float32Array(3);

                    } else if (value && edgeColor[0] === value[0] && edgeColor[1] === value[1] && edgeColor[2] === value[2]) {
                        return;
                    }

                    if (value) {
                        edgeColor[0] = value[0];
                        edgeColor[1] = value[1];
                        edgeColor[2] = value[2];

                    } else {
                        edgeColor[0] = 0.2;
                        edgeColor[1] = 0.2;
                        edgeColor[2] = 0.2;
                    }

                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.edgeColor;
                }
            },

            /**
             Transparency of ghost edges.

             A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

             @property edgeAlpha
             @default 0.5
             @type Number
             */
            edgeAlpha: {

                set: function (value) {

                    value = (value !== undefined && value !== null) ? value : 0.5;

                    if (this._state.edgeAlpha === value) {
                        return;
                    }

                    this._state.edgeAlpha = value;

                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.edgeAlpha;
                }
            },

            /**
             Width of ghost edges, in pixels.

             @property edgeWidth
             @default 1.0
             @type Number
             */
            edgeWidth: {

                set: function (value) {

                    this._state.edgeWidth = value || 1.0;

                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.edgeWidth;
                }
            },

            /**
             Indicates whether or not ghost vertices are visible.

             @property vertices
             @default false
             @type Boolean
             */
            vertices: {

                set: function (value) {
                    value = !!value;
                    if (this._state.vertices === value) {
                        return;
                    }
                    this._state.vertices = value;
                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.vertices;
                }
            },

            /**
             Color of ghost vertices.

             @property vertexColor
             @default [0.4,0.4,0.4]
             @type Float32Array
             */
            vertexColor: {

                set: function (value) {
                    var vertexColor = this._state.vertexColor;
                    if (!vertexColor) {
                        vertexColor = this._state.vertexColor = new Float32Array(3);
                    } else if (value && vertexColor[0] === value[0] && vertexColor[1] === value[1] && vertexColor[2] === value[2]) {
                        return;
                    }
                    if (value) {
                        vertexColor[0] = value[0];
                        vertexColor[1] = value[1];
                        vertexColor[2] = value[2];
                    } else {
                        vertexColor[0] = 0.4;
                        vertexColor[1] = 0.4;
                        vertexColor[2] = 0.4;
                    }
                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.vertexColor;
                }
            },

            /**
             Transparency of ghost vertices.

             A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

             @property vertexAlpha
             @default 0.7
             @type Number
             */
            vertexAlpha: {

                set: function (value) {
                    value = (value !== undefined && value !== null) ? value : 0.7;
                    if (this._state.vertexAlpha === value) {
                        return;
                    }
                    this._state.vertexAlpha = value;
                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.vertexAlpha;
                }
            },

            /**
             Pixel size of ghost vertices.

             @property vertexSize
             @default 4.0
             @type Number
             */
            vertexSize: {
                set: function (value) {
                    this._state.vertexSize = value || 4.0;
                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.vertexSize;
                }
            },

            /**
             Indicates whether or not ghost surfaces are filled with color.

             @property fill
             @default true
             @type Boolean
             */
            fill: {

                set: function (value) {
                    value = value !== false;
                    if (this._state.fill === value) {
                        return;
                    }
                    this._state.fill = value;
                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.fill;
                }
            },

            /**
             RGB color of filled ghost faces.

             @property fillColor
             @default [0.4, 0.4, 0.4]
             @type Float32Array
             */
            fillColor: {

                set: function (value) {

                    var fillColor = this._state.fillColor;

                    if (!fillColor) {
                        fillColor = this._state.fillColor = new Float32Array(3);

                    } else if (value && fillColor[0] === value[0] && fillColor[1] === value[1] && fillColor[2] === value[2]) {
                        return;
                    }

                    if (value) {
                        fillColor[0] = value[0];
                        fillColor[1] = value[1];
                        fillColor[2] = value[2];

                    } else {
                        fillColor[0] = 0.4;
                        fillColor[1] = 0.4;
                        fillColor[2] = 0.4;
                    }

                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.fillColor;
                }
            },

            /**
             Transparency of filled ghost faces.

             A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

             @property fillAlpha
             @default 0.2
             @type Number
             */
            fillAlpha: {

                set: function (value) {

                    value = (value !== undefined && value !== null) ? value : 0.2;

                    if (this._state.fillAlpha === value) {
                        return;
                    }

                    this._state.fillAlpha = value;

                    this._renderer.imageDirty();
                },

                get: function () {
                    return this._state.fillAlpha;
                }
            },


            /**
             Selects a preset EmphasisMaterial configuration.

             Available presets are:

             * "default" - grey wireframe with translucent fill, for light backgrounds.
             * "defaultLightBG" - grey wireframe with grey translucent fill, for light backgrounds.
             * "defaultDarkBG" - grey wireframe with grey translucent fill, for dark backgrounds.
             * "vectorscope" - green wireframe with glowing vertices and black translucent fill.
             * "battlezone" - green wireframe with black opaque fill, giving a solid hidden-lines-removed effect.
             * "sepia" - light red-grey wireframe with light sepia translucent fill - easy on the eyes.
             * "gamegrid" - light blue wireframe with dark blue translucent fill - reminiscent of Tron.
             * "yellowHighlight" - light yellow translucent fill - highlights while allowing underlying detail to show through.

             @property preset
             @default "default"
             @type String
             */
            preset: {

                set: function (value) {
                    value = value || "default";
                    if (this._preset === value) {
                        return;
                    }
                    var preset = xeogl.EmphasisMaterial.presets[value];
                    if (!preset) {
                        this.error("unsupported preset: '" + value + "' - supported values are " + Object.keys(xeogl.EmphasisMaterial.presets).join(", "));
                        return;
                    }
                    this.edges = preset.edges;
                    this.edgeColor = preset.edgeColor;
                    this.edgeAlpha = preset.edgeAlpha;
                    this.edgeWidth = preset.edgeWidth;
                    this.vertices = preset.vertices;
                    this.vertexColor = preset.vertexColor;
                    this.vertexAlpha = preset.vertexAlpha;
                    this.vertexSize = preset.vertexSize;
                    this.fill = preset.fill;
                    this.fillColor = preset.fillColor;
                    this.fillAlpha = preset.fillAlpha;
                    this._preset = value;
                },

                get: function () {
                    return this._preset;
                }
            }
        },

        _getState: function () {
            return this._state;
        },

        _destroy: function () {
            this._super();
            this._state.destroy();
        }
    });

    /**
     Available EmphasisMaterial presets.

     @property presets
     @type {Object}
     @static
     */
    xeogl.EmphasisMaterial.presets = {

        "default": {
            edges: true,
            edgeColor: [0.2, 0.2, 0.2],
            edgeAlpha: 0.5,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2
        },

        "defaultWhiteBG": {
            edgeColor: [0.2, 0.2, 0.2],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 4.0,
            fill: true,
            fillColor: [1, 1, 1],
            fillAlpha: 0.6
        },

        "defaultLightBG": {
            edges: true,
            edgeColor: [0.2, 0.2, 0.2],
            edgeAlpha: 0.5,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2
        },

        "defaultDarkBG": {
            edges: true,
            edgeColor: [0.5, 0.5, 0.5],
            edgeAlpha: 0.5,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2
        },

        "phosphorous": {
            edges: true,
            edgeColor: [0.9, 0.9, 0.9],
            edgeAlpha: 0.5,
            edgeWidth: 2,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 1.0,
            fill: true,
            fillColor: [0.0, 0.0, 0.0],
            fillAlpha: 0.4
        },

        "sunset": {
            edges: true,
            edgeColor: [0.9, 0.9, 0.9],
            edgeAlpha: 0.5,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.4, 0.4, 0.4],
            vertexAlpha: 0.7,
            vertexSize: 1.0,
            fill: true,
            fillColor: [0.9, 0.9, 0.6],
            fillAlpha: 0.2
        },

        "vectorscope": {
            edges: true,
            edgeColor: [0.2, 1.0, 0.2],
            edgeAlpha: 1,
            edgeWidth: 2,
            vertices: true,
            vertexColor: [0.7, 1.0, 0.7],
            vertexAlpha: 0.9,
            vertexSize: 8.0,
            fill: true,
            fillColor: [0.0, 0.0, 0.0],
            fillAlpha: 0.7
        },

        "battlezone": {
            edges: true,
            edgeColor: [0.2, 1.0, 0.2],
            edgeAlpha: 1,
            edgeWidth: 3,
            vertices: false,
            vertexColor: [0.8, 1.0, 0.8],
            vertexAlpha: 0.9,
            vertexSize: 8.0,
            fill: true,
            fillColor: [0.0, 0.0, 0.0],
            fillAlpha: 1.0
        },

        "sepia": {
            edges: true,
            edgeColor: [0.529411792755127, 0.4577854573726654, 0.4100345969200134],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.7, 1.0, 0.7],
            vertexAlpha: 0.9,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.970588207244873, 0.7965892553329468, 0.6660899519920349],
            fillAlpha: 0.4
        },

        "yellowHighlight": {
            edges: true,
            edgeColor: [0.529411792755127, 0.4577854573726654, 0.4100345969200134],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.7, 1.0, 0.7],
            vertexAlpha: 0.9,
            vertexSize: 4.0,
            fill: true,
            fillColor: [1.0, 1.0, 0.0],
            fillAlpha: 0.5
        },

        "greenSelected": {
            edges: true,
            edgeColor: [0.4577854573726654, 0.529411792755127, 0.4100345969200134],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            vertices: false,
            vertexColor: [0.7, 1.0, 0.7],
            vertexAlpha: 0.9,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.0, 1.0, 0.0],
            fillAlpha: 0.5
        },

        "gamegrid": {
            edges: true,
            edgeColor: [0.4, 0.4, 1.6],
            edgeAlpha: 0.8,
            edgeWidth: 3,
            vertices: false,
            vertexColor: [0.7, 1.0, 0.7],
            vertexAlpha: 0.9,
            vertexSize: 4.0,
            fill: true,
            fillColor: [0.2, 0.2, 0.7],
            fillAlpha: 0.9
        }
    };

    xeogl.GhostMaterial = xeogl.EmphasisMaterial; // Backward compatibility

})();