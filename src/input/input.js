/**
 Publishes keyboard and mouse events that occur on the parent {{#crossLink "Scene"}}{{/crossLink}}'s {{#crossLink "Canvas"}}{{/crossLink}}.

 * Each {{#crossLink "Scene"}}{{/crossLink}} provides an Input on itself as a read-only property.

 <img src="../../../assets/images/Input.png"></img>

 ## Usage

 In this example, we're subscribing to some mouse and key events that will occur on
 a {{#crossLink "Scene"}}Scene's{{/crossLink}} {{#crossLink "Canvas"}}Canvas{{/crossLink}}.

 ````javascript
 var myScene = new xeogl.Scene();

 var input = myScene.input;

 // We'll save a handle to this subscription
 // to show how to unsubscribe, further down
 var handle = input.on("mousedown", function(coords) {
       console.log("Mouse down at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("mouseup", function(coords) {
       console.log("Mouse up at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("mouseclicked", function(coords) {
      console.log("Mouse clicked at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("dblclick", function(coords) {
       console.log("Double-click at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("keydown", function(keyCode) {
        switch (keyCode) {

            case this.KEY_A:
               console.log("The 'A' key is down");
               break;

            case this.KEY_B:
               console.log("The 'B' key is down");
               break;

            case this.KEY_C:
               console.log("The 'C' key is down");
               break;

            default:
               console.log("Some other key is down");
       }
     });

 input.on("keyup", function(keyCode) {
        switch (keyCode) {

            case this.KEY_A:
               console.log("The 'A' key is up");
               break;

            case this.KEY_B:
               console.log("The 'B' key is up");
               break;

            case this.KEY_C:
               console.log("The 'C' key is up");
               break;

            default:
               console.log("Some other key is up");
        }
     });

 // TODO: ALT and CTRL keys etc
 ````

 ### Unsubscribing from Events

 In the snippet above, we saved a handle to one of our event subscriptions.

 We can then use that handle to unsubscribe again, like this:

 ````javascript
 input.off(handle);
 ````

 @class Input
 @module xeogl
 @submodule input
 @extends Component
 */
(function () {

    "use strict";

    xeogl.Input = xeogl.Component.extend({

        type: "xeogl.Input",

        serializable: false,

        _init: function (cfg) {

            var self = this;

            // True when ALT down
            this.altDown = false;

            /** True whenever CTRL is down
             *
             * @type {boolean}
             */
            this.ctrlDown = false;

            /** True whenever left mouse button is down
             *
             * @type {boolean}
             */
            this.mouseDownLeft = false;

            /** True whenever middle mouse button is down
             *
             * @type {boolean}
             */
            this.mouseDownMiddle = false;

            /** True whenever right mouse button is down
             *
             * @type {boolean}
             */
            this.mouseDownRight = false;

            /** Flag for each key that's down
             *
             * @type {boolean}
             */
            this.keyDown = [];

            /** True while input enabled
             *
             * @type {boolean}
             */
            this.enabled = true;

            /** True while mouse is over the parent {{#crossLink "Scene"}}Scene's{{/crossLink}} {{#crossLink "Canvas"}}Canvas{{/crossLink}}
             *
             * @type {boolean}
             */
            this.mouseover = false;

            // Capture input events and publish them on this component

            document.addEventListener("keydown", this._keyDownListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {

                    if (e.ctrlKey) {
                        self.ctrlDown = true;

                    } else if (e.altKey) {
                        self.altDown = true;

                    } else {
                        self.keyDown[e.keyCode] = true;

                        /**
                         * Fired whenever a key is pressed while the parent
                         * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}} has input focus.
                         * @event keydown
                         * @param value {Number} The key code, for example {{#crossLink "Input/KEY_LEFT_ARROW:property"}}{{/crossLink}},
                         */
                        self.fire("keydown", e.keyCode, true);
                    }
                }

                if (self.mouseover) {
                    e.preventDefault();
                }

            }, true);

            document.addEventListener("keyup", this._keyUpListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {

                    if (e.ctrlKey) {
                        self.ctrlDown = false;

                    } else if (e.altKey) {
                        self.altDown = false;

                    } else {
                        self.keyDown[e.keyCode] = false;

                        /**
                         * Fired whenever a key is released while the parent
                         * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}} has input focus.
                         * @event keyup
                         * @param value {Number} The key code, for example {{#crossLink "Input/KEY_LEFT_ARROW:property"}}{{/crossLink}},
                         */
                        self.fire("keyup", e.keyCode, true);
                    }
                }
            });

            cfg.element.addEventListener("mouseenter", this._mouseEnterListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                self.mouseover = true;

                var coords = self._getClickCoordsWithinElement(e);

                /**
                 * Fired whenever the mouse is moved into of the parent
                 * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event mouseenter
                 * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                 */
                self.fire("mouseenter", coords, true);
            });

            cfg.element.addEventListener("mouseleave", this._mouseLeaveListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                self.mouseover = false;

                var coords = self._getClickCoordsWithinElement(e);

                /**
                 * Fired whenever the mouse is moved out of the parent
                 * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event mouseleave
                 * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                 */
                self.fire("mouseleave", coords, true);
            });


            cfg.element.addEventListener("mousedown", this._mouseDownListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                switch (e.which) {

                    case 1:// Left button
                        self.mouseDownLeft = true;
                        break;

                    case 2:// Middle/both buttons
                        self.mouseDownMiddle = true;
                        break;

                    case 3:// Right button
                        self.mouseDownRight = true;
                        break;

                    default:
                        break;
                }

                var coords = self._getClickCoordsWithinElement(e);

                cfg.element.focus();

                /**
                 * Fired whenever the mouse is pressed over the parent
                 * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event mousedown
                 * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                 */
                self.fire("mousedown", coords, true);

                if (self.mouseover) {
                    e.preventDefault();
                }
            });

            document.addEventListener("mouseup", this._mouseUpListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                switch (e.which) {

                    case 1:// Left button
                        self.mouseDownLeft = false;
                        break;

                    case 2:// Middle/both buttons
                        self.mouseDownMiddle = false;
                        break;

                    case 3:// Right button
                        self.mouseDownRight = false;
                        break;

                    default:
                        break;
                }

                var coords = self._getClickCoordsWithinElement(e);

                /**
                 * Fired whenever the mouse is released over the parent
                 * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event mouseup
                 * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                 */
                self.fire("mouseup", coords, true);

                if (self.mouseover) {
                    e.preventDefault();
                }
            }, true);

            document.addEventListener("dblclick", this._dblClickListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                switch (e.which) {

                    case 1:// Left button
                        self.mouseDownLeft = false;
                        self.mouseDownRight = false;
                        break;

                    case 2:// Middle/both buttons
                        self.mouseDownMiddle = false;
                        break;

                    case 3:// Right button
                        self.mouseDownLeft = false;
                        self.mouseDownRight = false;
                        break;

                    default:
                        break;
                }

                var coords = self._getClickCoordsWithinElement(e);

                /**
                 * Fired whenever the mouse is double-clicked over the parent
                 * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event dblclick
                 * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                 */
                self.fire("dblclick", coords, true);

                if (self.mouseover) {
                    e.preventDefault();
                }
            });

            cfg.element.addEventListener("mousemove", this._mouseMoveListener = function (e) {

                if (!self.enabled) {
                    return;
                }

                var coords = self._getClickCoordsWithinElement(e);

                /**
                 * Fired whenever the mouse is moved over the parent
                 * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event mousedown
                 * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                 */
                self.fire("mousemove", coords, true);

                if (self.mouseover) {
                    e.preventDefault();
                }
            });

            cfg.element.addEventListener("wheel", this._mouseWheelListener = function (e, d) {

                if (!self.enabled) {
                    return;
                }

                var delta = Math.max(-1, Math.min(1, -e.deltaY * 40));

                /**
                 * Fired whenever the mouse wheel is moved over the parent
                 * {{#crossLink "Viewer"}}Viewer{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                 * @event mousewheel
                 * @param delta {Number} The mouse wheel delta,
                 */
                self.fire("mousewheel", delta, true);
            }, {passive: true});

            // mouseclicked

            (function () {

                var downX;
                var downY;

                // Tolerance between down and up positions for a mouse click
                var tolerance = 2;

                self.on("mousedown", function (params) {
                    downX = params[0];
                    downY = params[1];
                });

                self.on("mouseup", function (params) {

                    if (downX >= (params[0] - tolerance) &&
                        downX <= (params[0] + tolerance) &&
                        downY >= (params[1] - tolerance) &&
                        downY <= (params[1] + tolerance)) {

                        /**
                         * Fired whenever the mouse is clicked over the parent
                         * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                         * @event mouseclicked
                         * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                         */
                        self.fire("mouseclicked", params, true);
                    }
                });
            })();


            // VR

            (function () {

                var orientationAngleLookup = {
                    'landscape-primary': 90,
                    'landscape-secondary': -90,
                    'portrait-secondary': 180,
                    'portrait-primary': 0
                };

                var orientation;
                var orientationAngle;
                var acceleration = xeogl.math.vec3();
                var accelerationIncludingGravity = xeogl.math.vec3();

                var orientationChangeEvent = {
                    orientation: null,
                    orientationAngle: 0
                };

                var deviceMotionEvent = {
                    orientationAngle: 0,
                    acceleration: null,
                    accelerationIncludingGravity: accelerationIncludingGravity,
                    rotationRate: xeogl.math.vec3(),
                    interval: 0
                };

                var deviceOrientationEvent = {
                    alpha: 0,
                    beta: 0,
                    gamma: 0,
                    absolute: false
                };

                if (window.OrientationChangeEvent) {
                    window.addEventListener('orientationchange', self._orientationchangedListener = function () {

                            orientation = window.screen.orientation || window.screen.mozOrientation || window.msOrientation || null;
                            orientationAngle = orientation ? (orientationAngleLookup[orientation] || 0) : 0;

                            orientationChangeEvent.orientation = orientation;
                            orientationChangeEvent.orientationAngle = orientationAngle;

                            /**
                             * Fired when the orientation of the device has changed.
                             *
                             * @event orientationchange
                             * @param orientation The orientation: "landscape-primary", "landscape-secondary", "portrait-secondary" or "portrait-primary"
                             * @param orientationAngle The orientation angle in degrees: 90 for landscape-primary, -90 for landscape-secondary, 180 for portrait-secondary or 0 for portrait-primary.
                             */
                            self.fire("orientationchange", orientationChangeEvent);
                        },
                        false);
                }

                if (window.DeviceMotionEvent) {
                    window.addEventListener('devicemotion', self._deviceMotionListener = function (e) {

                            deviceMotionEvent.interval = e.interval;
                            deviceMotionEvent.orientationAngle = orientationAngle;

                            var accel = e.acceleration;

                            if (accel) {
                                acceleration[0] = accel.x;
                                acceleration[1] = accel.y;
                                acceleration[2] = accel.z;
                                deviceMotionEvent.acceleration = acceleration;
                            } else {
                                deviceMotionEvent.acceleration = null;
                            }

                            var accelGrav = e.accelerationIncludingGravity;

                            if (accelGrav) {
                                accelerationIncludingGravity[0] = accelGrav.x;
                                accelerationIncludingGravity[1] = accelGrav.y;
                                accelerationIncludingGravity[2] = accelGrav.z;
                                deviceMotionEvent.accelerationIncludingGravity = accelerationIncludingGravity;
                            } else {
                                deviceMotionEvent.accelerationIncludingGravity = null;
                            }

                            deviceMotionEvent.rotationRate = e.rotationRate;

                            /**
                             * Fires on a regular interval and returns data about the rotation
                             * (in degrees per second) and acceleration (in meters per second squared) of the device, at that moment in
                             * time. Some devices do not have the hardware to exclude the effect of gravity.
                             *
                             * @event devicemotion
                             * @param Float32Array acceleration The acceleration of the device, in meters per second squared, as a 3-element vector. This value has taken into account the effect of gravity and removed it from the figures. This value may not exist if the hardware doesn't know how to remove gravity from the acceleration data.
                             * @param Float32Array accelerationIncludingGravity The acceleration of the device, in meters per second squared, as a 3-element vector. This value includes the effect of gravity, and may be the only value available on devices that don't have a gyroscope to allow them to properly remove gravity from the data.
                             * @param, Number interval The interval, in milliseconds, at which this event is fired. The next event will be fired in approximately this amount of time.
                             * @param  Float32Array rotationRate The rates of rotation of the device about each axis, in degrees per second.
                             */
                            self.fire("devicemotion", deviceMotionEvent);
                        },
                        false);
                }

                if (window.DeviceOrientationEvent) {
                    window.addEventListener("deviceorientation", self._deviceOrientListener = function (e) {

                            deviceOrientationEvent.gamma = e.gamma;
                            deviceOrientationEvent.beta = e.beta;
                            deviceOrientationEvent.alpha = e.alpha;
                            deviceOrientationEvent.absolute = e.absolute;

                            /**
                             * Fired when fresh data is available from an orientation sensor about the current orientation
                             * of the device as compared to the Earth coordinate frame. This data is gathered from a
                             * magnetometer inside the device. See
                             * <a href="https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Orientation_and_motion_data_explained">Orientation and motion data explained</a> for more info.
                             *
                             * @event deviceorientation
                             * @param Number alpha The current orientation of the device around the Z axis in degrees; that is, how far the device is rotated around a line perpendicular to the device.
                             * @param Number beta The current orientation of the device around the X axis in degrees; that is, how far the device is tipped forward or backward.
                             * @param Number gamma The current orientation of the device around the Y axis in degrees; that is, how far the device is turned left or right.
                             * @param Boolean absolute This value is true if the orientation is provided as a difference between the device coordinate frame and the Earth coordinate frame; if the device can't detect the Earth coordinate frame, this value is false.
                             */
                            self.fire("deviceorientation", deviceOrientationEvent);
                        },
                        false);
                }
            })();
        },

        _getClickCoordsWithinElement: function (event) {
            var coords = [0, 0];
            if (!event) {
                event = window.event;
                coords.x = event.x;
                coords.y = event.y;
            }
            else {
                var element = event.target;
                var totalOffsetLeft = 0;
                var totalOffsetTop = 0;

                while (element.offsetParent) {
                    totalOffsetLeft += element.offsetLeft;
                    totalOffsetTop += element.offsetTop;
                    element = element.offsetParent;
                }
                coords[0] = event.pageX - totalOffsetLeft;
                coords[1] = event.pageY - totalOffsetTop;
            }
            return coords;
        },

        /**
         * Enable or disable all input handlers
         *
         * @param enable
         */
        setEnabled: function (enable) {
            if (this.enabled !== enable) {
                this.fire("enabled", this.enabled = enable);
            }
        },

        // Key codes

        /**
         * Code for the BACKSPACE key.
         * @property KEY_BACKSPACE
         * @final
         * @type Number
         */
        KEY_BACKSPACE: 8,

        /**
         * Code for the TAB key.
         * @property KEY_TAB
         * @final
         * @type Number
         */
        KEY_TAB: 9,

        /**
         * Code for the ENTER key.
         * @property KEY_ENTER
         * @final
         * @type Number
         */
        KEY_ENTER: 13,

        /**
         * Code for the SHIFT key.
         * @property KEY_SHIFT
         * @final
         * @type Number
         */
        KEY_SHIFT: 16,

        /**
         * Code for the CTRL key.
         * @property KEY_CTRL
         * @final
         * @type Number
         */
        KEY_CTRL: 17,

        /**
         * Code for the ALT key.
         * @property KEY_ALT
         * @final
         * @type Number
         */
        KEY_ALT: 18,

        /**
         * Code for the PAUSE_BREAK key.
         * @property KEY_PAUSE_BREAK
         * @final
         * @type Number
         */
        KEY_PAUSE_BREAK: 19,

        /**
         * Code for the CAPS_LOCK key.
         * @property KEY_CAPS_LOCK
         * @final
         * @type Number
         */
        KEY_CAPS_LOCK: 20,

        /**
         * Code for the ESCAPE key.
         * @property KEY_ESCAPE
         * @final
         * @type Number
         */
        KEY_ESCAPE: 27,

        /**
         * Code for the PAGE_UP key.
         * @property KEY_PAGE_UP
         * @final
         * @type Number
         */
        KEY_PAGE_UP: 33,

        /**
         * Code for the PAGE_DOWN key.
         * @property KEY_PAGE_DOWN
         * @final
         * @type Number
         */
        KEY_PAGE_DOWN: 34,

        /**
         * Code for the END key.
         * @property KEY_END
         * @final
         * @type Number
         */
        KEY_END: 35,

        /**
         * Code for the HOME key.
         * @property KEY_HOME
         * @final
         * @type Number
         */
        KEY_HOME: 36,

        /**
         * Code for the LEFT_ARROW key.
         * @property KEY_LEFT_ARROW
         * @final
         * @type Number
         */
        KEY_LEFT_ARROW: 37,

        /**
         * Code for the UP_ARROW key.
         * @property KEY_UP_ARROW
         * @final
         * @type Number
         */
        KEY_UP_ARROW: 38,

        /**
         * Code for the RIGHT_ARROW key.
         * @property KEY_RIGHT_ARROW
         * @final
         * @type Number
         */
        KEY_RIGHT_ARROW: 39,

        /**
         * Code for the DOWN_ARROW key.
         * @property KEY_DOWN_ARROW
         * @final
         * @type Number
         */
        KEY_DOWN_ARROW: 40,

        /**
         * Code for the INSERT key.
         * @property KEY_INSERT
         * @final
         * @type Number
         */
        KEY_INSERT: 45,

        /**
         * Code for the DELETE key.
         * @property KEY_DELETE
         * @final
         * @type Number
         */
        KEY_DELETE: 46,

        /**
         * Code for the 0 key.
         * @property KEY_NUM_0
         * @final
         * @type Number
         */
        KEY_NUM_0: 48,

        /**
         * Code for the 1 key.
         * @property KEY_NUM_1
         * @final
         * @type Number
         */
        KEY_NUM_1: 49,

        /**
         * Code for the 2 key.
         * @property KEY_NUM_2
         * @final
         * @type Number
         */
        KEY_NUM_2: 50,

        /**
         * Code for the 3 key.
         * @property KEY_NUM_3
         * @final
         * @type Number
         */
        KEY_NUM_3: 51,

        /**
         * Code for the 4 key.
         * @property KEY_NUM_4
         * @final
         * @type Number
         */
        KEY_NUM_4: 52,

        /**
         * Code for the 5 key.
         * @property KEY_NUM_5
         * @final
         * @type Number
         */
        KEY_NUM_5: 53,

        /**
         * Code for the 6 key.
         * @property KEY_NUM_6
         * @final
         * @type Number
         */
        KEY_NUM_6: 54,

        /**
         * Code for the 7 key.
         * @property KEY_NUM_7
         * @final
         * @type Number
         */
        KEY_NUM_7: 55,

        /**
         * Code for the 8 key.
         * @property KEY_NUM_8
         * @final
         * @type Number
         */
        KEY_NUM_8: 56,

        /**
         * Code for the 9 key.
         * @property KEY_NUM_9
         * @final
         * @type Number
         */
        KEY_NUM_9: 57,

        /**
         * Code for the A key.
         * @property KEY_A
         * @final
         * @type Number
         */
        KEY_A: 65,

        /**
         * Code for the B key.
         * @property KEY_B
         * @final
         * @type Number
         */
        KEY_B: 66,

        /**
         * Code for the C key.
         * @property KEY_C
         * @final
         * @type Number
         */
        KEY_C: 67,

        /**
         * Code for the D key.
         * @property KEY_D
         * @final
         * @type Number
         */
        KEY_D: 68,

        /**
         * Code for the E key.
         * @property KEY_E
         * @final
         * @type Number
         */
        KEY_E: 69,

        /**
         * Code for the F key.
         * @property KEY_F
         * @final
         * @type Number
         */
        KEY_F: 70,

        /**
         * Code for the G key.
         * @property KEY_G
         * @final
         * @type Number
         */
        KEY_G: 71,

        /**
         * Code for the H key.
         * @property KEY_H
         * @final
         * @type Number
         */
        KEY_H: 72,

        /**
         * Code for the I key.
         * @property KEY_I
         * @final
         * @type Number
         */
        KEY_I: 73,

        /**
         * Code for the J key.
         * @property KEY_J
         * @final
         * @type Number
         */
        KEY_J: 74,

        /**
         * Code for the K key.
         * @property KEY_K
         * @final
         * @type Number
         */
        KEY_K: 75,

        /**
         * Code for the L key.
         * @property KEY_L
         * @final
         * @type Number
         */
        KEY_L: 76,

        /**
         * Code for the M key.
         * @property KEY_M
         * @final
         * @type Number
         */
        KEY_M: 77,

        /**
         * Code for the N key.
         * @property KEY_N
         * @final
         * @type Number
         */
        KEY_N: 78,

        /**
         * Code for the O key.
         * @property KEY_O
         * @final
         * @type Number
         */
        KEY_O: 79,

        /**
         * Code for the P key.
         * @property KEY_P
         * @final
         * @type Number
         */
        KEY_P: 80,

        /**
         * Code for the Q key.
         * @property KEY_Q
         * @final
         * @type Number
         */
        KEY_Q: 81,

        /**
         * Code for the R key.
         * @property KEY_R
         * @final
         * @type Number
         */
        KEY_R: 82,

        /**
         * Code for the S key.
         * @property KEY_S
         * @final
         * @type Number
         */
        KEY_S: 83,

        /**
         * Code for the T key.
         * @property KEY_T
         * @final
         * @type Number
         */
        KEY_T: 84,

        /**
         * Code for the U key.
         * @property KEY_U
         * @final
         * @type Number
         */
        KEY_U: 85,

        /**
         * Code for the V key.
         * @property KEY_V
         * @final
         * @type Number
         */
        KEY_V: 86,

        /**
         * Code for the W key.
         * @property KEY_W
         * @final
         * @type Number
         */
        KEY_W: 87,

        /**
         * Code for the X key.
         * @property KEY_X
         * @final
         * @type Number
         */
        KEY_X: 88,

        /**
         * Code for the Y key.
         * @property KEY_Y
         * @final
         * @type Number
         */
        KEY_Y: 89,

        /**
         * Code for the Z key.
         * @property KEY_Z
         * @final
         * @type Number
         */
        KEY_Z: 90,

        /**
         * Code for the LEFT_WINDOW key.
         * @property KEY_LEFT_WINDOW
         * @final
         * @type Number
         */
        KEY_LEFT_WINDOW: 91,

        /**
         * Code for the RIGHT_WINDOW key.
         * @property KEY_RIGHT_WINDOW
         * @final
         * @type Number
         */
        KEY_RIGHT_WINDOW: 92,

        /**
         * Code for the SELECT key.
         * @property KEY_SELECT
         * @final
         * @type Number
         */
        KEY_SELECT_KEY: 93,

        /**
         * Code for the number pad 0 key.
         * @property KEY_NUMPAD_0
         * @final
         * @type Number
         */
        KEY_NUMPAD_0: 96,

        /**
         * Code for the number pad 1 key.
         * @property KEY_NUMPAD_1
         * @final
         * @type Number
         */
        KEY_NUMPAD_1: 97,

        /**
         * Code for the number pad 2 key.
         * @property KEY_NUMPAD 2
         * @final
         * @type Number
         */
        KEY_NUMPAD_2: 98,

        /**
         * Code for the number pad 3 key.
         * @property KEY_NUMPAD_3
         * @final
         * @type Number
         */
        KEY_NUMPAD_3: 99,

        /**
         * Code for the number pad 4 key.
         * @property KEY_NUMPAD_4
         * @final
         * @type Number
         */
        KEY_NUMPAD_4: 100,

        /**
         * Code for the number pad 5 key.
         * @property KEY_NUMPAD_5
         * @final
         * @type Number
         */
        KEY_NUMPAD_5: 101,

        /**
         * Code for the number pad 6 key.
         * @property KEY_NUMPAD_6
         * @final
         * @type Number
         */
        KEY_NUMPAD_6: 102,

        /**
         * Code for the number pad 7 key.
         * @property KEY_NUMPAD_7
         * @final
         * @type Number
         */
        KEY_NUMPAD_7: 103,

        /**
         * Code for the number pad 8 key.
         * @property KEY_NUMPAD_8
         * @final
         * @type Number
         */
        KEY_NUMPAD_8: 104,

        /**
         * Code for the number pad 9 key.
         * @property KEY_NUMPAD_9
         * @final
         * @type Number
         */
        KEY_NUMPAD_9: 105,

        /**
         * Code for the MULTIPLY key.
         * @property KEY_MULTIPLY
         * @final
         * @type Number
         */
        KEY_MULTIPLY: 106,

        /**
         * Code for the ADD key.
         * @property KEY_ADD
         * @final
         * @type Number
         */
        KEY_ADD: 107,

        /**
         * Code for the SUBTRACT key.
         * @property KEY_SUBTRACT
         * @final
         * @type Number
         */
        KEY_SUBTRACT: 109,

        /**
         * Code for the DECIMAL POINT key.
         * @property KEY_DECIMAL_POINT
         * @final
         * @type Number
         */
        KEY_DECIMAL_POINT: 110,

        /**
         * Code for the DIVIDE key.
         * @property KEY_DIVIDE
         * @final
         * @type Number
         */
        KEY_DIVIDE: 111,

        /**
         * Code for the F1 key.
         * @property KEY_F1
         * @final
         * @type Number
         */
        KEY_F1: 112,

        /**
         * Code for the F2 key.
         * @property KEY_F2
         * @final
         * @type Number
         */
        KEY_F2: 113,

        /**
         * Code for the F3 key.
         * @property KEY_F3
         * @final
         * @type Number
         */
        KEY_F3: 114,

        /**
         * Code for the F4 key.
         * @property KEY_F4
         * @final
         * @type Number
         */
        KEY_F4: 115,

        /**
         * Code for the F5 key.
         * @property KEY_F5
         * @final
         * @type Number
         */
        KEY_F5: 116,

        /**
         * Code for the F6 key.
         * @property KEY_F6
         * @final
         * @type Number
         */
        KEY_F6: 117,

        /**
         * Code for the F7 key.
         * @property KEY_F7
         * @final
         * @type Number
         */
        KEY_F7: 118,

        /**
         * Code for the F8 key.
         * @property KEY_F8
         * @final
         * @type Number
         */
        KEY_F8: 119,

        /**
         * Code for the F9 key.
         * @property KEY_F9
         * @final
         * @type Number
         */
        KEY_F9: 120,

        /**
         * Code for the F10 key.
         * @property KEY_F10
         * @final
         * @type Number
         */
        KEY_F10: 121,

        /**
         * Code for the F11 key.
         * @property KEY_F11
         * @final
         * @type Number
         */
        KEY_F11: 122,

        /**
         * Code for the F12 key.
         * @property KEY_F12
         * @final
         * @type Number
         */
        KEY_F12: 123,

        /**
         * Code for the NUM_LOCK key.
         * @property KEY_NUM_LOCK
         * @final
         * @type Number
         */
        KEY_NUM_LOCK: 144,

        /**
         * Code for the SCROLL_LOCK key.
         * @property KEY_SCROLL_LOCK
         * @final
         * @type Number
         */
        KEY_SCROLL_LOCK: 145,

        /**
         * Code for the SEMI_COLON key.
         * @property KEY_SEMI_COLON
         * @final
         * @type Number
         */
        KEY_SEMI_COLON: 186,

        /**
         * Code for the EQUAL_SIGN key.
         * @property KEY_EQUAL_SIGN
         * @final
         * @type Number
         */
        KEY_EQUAL_SIGN: 187,

        /**
         * Code for the COMMA key.
         * @property KEY_COMMA
         * @final
         * @type Number
         */
        KEY_COMMA: 188,

        /**
         * Code for the DASH key.
         * @property KEY_DASH
         * @final
         * @type Number
         */
        KEY_DASH: 189,

        /**
         * Code for the PERIOD key.
         * @property KEY_PERIOD
         * @final
         * @type Number
         */
        KEY_PERIOD: 190,

        /**
         * Code for the FORWARD_SLASH key.
         * @property KEY_FORWARD_SLASH
         * @final
         * @type Number
         */
        KEY_FORWARD_SLASH: 191,

        /**
         * Code for the GRAVE_ACCENT key.
         * @property KEY_GRAVE_ACCENT
         * @final
         * @type Number
         */
        KEY_GRAVE_ACCENT: 192,

        /**
         * Code for the OPEN_BRACKET key.
         * @property KEY_OPEN_BRACKET
         * @final
         * @type Number
         */
        KEY_OPEN_BRACKET: 219,

        /**
         * Code for the BACK_SLASH key.
         * @property KEY_BACK_SLASH
         * @final
         * @type Number
         */
        KEY_BACK_SLASH: 220,

        /**
         * Code for the CLOSE_BRACKET key.
         * @property KEY_CLOSE_BRACKET
         * @final
         * @type Number
         */
        KEY_CLOSE_BRACKET: 221,

        /**
         * Code for the SINGLE_QUOTE key.
         * @property KEY_SINGLE_QUOTE
         * @final
         * @type Number
         */
        KEY_SINGLE_QUOTE: 222,

        /**
         * Code for the SPACE key.
         * @property KEY_SPACE
         * @final
         * @type Number
         */
        KEY_SPACE: 32,


        _destroy: function () {
            document.removeEventListener("keydown", this._keyDownListener);
            document.removeEventListener("keyup", this._keyUpListener);
        }
    });

})();
