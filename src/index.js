void function(win){
	'use strict'

	var Touch = {
		version: '0.1',
		detectGesture: detectGesture
	}

	//tap, dbltap, hold
	//pan, drag, swipe/slide, flick/fling, pinch/stretch/spread, turn/rotate

	function detectGesture(e, gestures) {

		var touches = {}
		var detectors = gestures.map(function(gesture){
			if (typeof gesture === 'string')
				return GestureDetector[gesture]
			else if (gesture instanceof GestureDetector)
				return gesture
			else throw TypeError()
		})

		function gc(id) {
			setTimeout(function(){
				delete touches[id]
			}, 100)
		}

		e.addEventListener('touchstart', function(evt){
			for (var list = evt.changedTouches, n = list.length, i = 0; i < n; i++) {
				var touch = list[i]
				touches[touch.identifier] = {
					start: {x: touch.screenX, y: touch.screenY, t: evt.timeStamp},
					moves: [],
					end: null,
					cancel: null
				}
			}
			for (var i = 0; i < detectors.length; i++){
				detectors[i].ontouchstart(evt, touches)
			}
			// most Android browsers need calling preventDefault()
			// to allow future touchmove events
			//evt.preventDefault()
		})
		e.addEventListener('touchend', function(evt){
			for (var list = evt.changedTouches, n = list.length, i = 0; i < n; i++) {
				var touch = list[i]
				touches[touch.identifier].end = {
					x: touch.screenX, y: touch.screenY, t: evt.timeStamp
				}
			}
			for (var i = 0; i < detectors.length; i++)
				detectors[i].ontouchend(evt, touches)
			gc(touch.identifier)

			//evt.preventDefault()
		})
		e.addEventListener('touchmove', function(evt){
			for (var list = evt.changedTouches, n = list.length, i = 0; i < n; i++) {
				var touch = list[i]
				var moves = touches[touch.identifier].moves

				// Android will generate touchmove events even no move
				if (moves.length > 0
					&& moves[moves.length - 1].x === touch.screenX
					&& moves[moves.length - 1].y === touch.screenY
					) return

				moves.push({
					x: touch.screenX, y: touch.screenY, t: evt.timeStamp
				})
			}
			for (var i = 0; i < detectors.length; i++)
				detectors[i].ontouchmove(evt, touches)

		})
		e.addEventListener('touchcancel', function(evt){
			for (var list = evt.changedTouches, n = list.length, i = 0; i < n; i++) {
				var touch = list[i]
				touches[touch.identifier].cancel = {
					x: touch.screenX, y: touch.screenY, t: evt.timeStamp
				}
			}
			for (var i = 0; i < detectors.length; i++)
				detectors[i].ontouchcancel(evt, touches)
			gc(touch.identifier)

			//evt.preventDefault()
		})
	}


	var noop = function(){}

	function Motion(p1, p2) {
		this.p1 = p1
		this.p2 = p2
	}
	Object.defineProperties(Motion.prototype, {
		dt: {get: function(){ return this.p2.t - this.p1.t }},
		dx: {get: function(){ return this.p2.x - this.p1.x }},
		dy: {get: function(){ return this.p2.y - this.p1.y }},
		dist: {get: function(){
			var dx = this.dx, dy = this.dy
			return Math.sqrt(dx * dx + dy * dy)
		}},
		vx: {get: function(){ return this.dx / this.dt }},
		vy: {get: function(){ return this.dy / this.dt }},
		v: {get: function(){ return this.dist / this.dt }}
	})

	function TouchGestureEvent(type, initDict){
		var evt = new win.UIEvent(type, initDict)
		evt.motion = initDict.motion
		return evt
	}
	TouchGestureEvent.prototype = win.UIEvent.prototype

	function TapDetector(settings) {
		GestureDetector.call(this, settings)
	}
	TapDetector.prototype = Object.create(GestureDetector.prototype, {
		settings: {value: {
			TAP_TIME_THRESHOLD: 200, //ms
			TAP_MOTION_THRESHOLD: 16 //px
		}},
		ontouchend: {value: function(evt, touches){
			if (evt.changedTouches.length === 1) {
				var touch = touches[evt.changedTouches[0].identifier]
				var m = new Motion(touch.start, touch.end)
				if (m.dt < this.settings.TAP_TIME_THRESHOLD &&
					m.dist < this.settings.TAP_MOTION_THRESHOLD
				) {
					var e = new TouchGestureEvent('tap', {
						bubbles: true, cancelable:true,
						motion: m
					})
					var result = evt.target.dispatchEvent(e)
					if (e.defaultPrevented === false
						|| e.defaultPrevented === undefined && e.returnValue !== false // Android 2.x bug: no defaultPrevented attr
					) {
						evt.preventDefault()
						var clickEvt = new MouseEvent('click', {
							bubbles: true,
							cancelable: true
						})
						evt.target.dispatchEvent(clickEvt)
					} //else $warn('tap cancelled')
					//return result
				}
			}
		}},
	})

	var PanDetector = {
		PAN_MOTION_THRESHOLD: 10, //px, 2.7mm
		ontouchstart: noop,
		ontouchend: function(evt, touches){
			var touch = touches[evt.changedTouches[0].identifier]
			if (evt.touches.length === 0 && touch.pan) {
				var m = new Motion(touch.start, touch.end)
				var e = new TouchGestureEvent('panend', {
					bubbles: true,
					motion: m
				})
				var result = evt.target.dispatchEvent(e)
				if (e.defaultPrevented) evt.preventDefault()
				return result
			}
			evt.preventDefault()
		},
		ontouchmove: function(evt, touches){
			var touch = touches[evt.changedTouches[0].identifier]
			if (evt.touches.length === 1) {
				var m = new Motion(touch.start, touch.moves[touch.moves.length - 1])
				if (!touch.pan) {
					if (m.dist > this.PAN_MOTION_THRESHOLD) {
						var e = new TouchGestureEvent('panstart', {
							bubbles: true,
							motion: m
						})
						evt.target.dispatchEvent(e)
						if (!e.defaultPrevented) {
							touch.pan = m
							evt.preventDefault()
						}
						return
					}
				} else {
					var e = new TouchGestureEvent('pan', {
						bubbles: true, cancelable:true,
						motion: m
					})
					var result = evt.target.dispatchEvent(e)
					if (e.defaultPrevented) {

					} else {
						evt.preventDefault()
					}
					return result
				}
			}
		},
		ontouchcancel: function(){
			$log('cancel!')
		}
	}
	var FlickDetector = {
		FLICK_VELOCITY_THRESHOLD: 0.5, //px/ms
		FLICK_TIME_THRESHOLD: 100, //ms

		ontouchstart: noop,
		ontouchend: function(evt, touches){
			var touch = touches[evt.changedTouches[0].identifier]
			if (evt.changedTouches.length === 1) {
				var m = new Motion(
					touch.moves.length >= 1 ?
						touch.moves[touch.moves.length - 1] :
						touch.start,
					touch.end)
				if (m.dist === 0) {
					if (m.dt > this.FLICK_TIME_THRESHOLD) touch.flick = null
				} else {
					touch.flick = m.v > this.FLICK_VELOCITY_THRESHOLD ? m : null
				}
			} else {
				touch.flick = null
			}
			if (touch.flick) {
				var e = new TouchGestureEvent('flick', {
					bubbles: true, cancelable:true,
					motion: touch.flick
				})
				return evt.target.dispatchEvent(e)
			}
		},
		ontouchmove: function(evt, touches){
			var touch = touches[evt.changedTouches[0].identifier]
			if (evt.touches.length === 1) {
				var m = new Motion(
					touch.moves.length >= 2 ?
						touch.moves[touch.moves.length - 2] :
						touch.start,
					touch.moves[touch.moves.length - 1])
				//$warn(m.dx, m.dy, m.dt, m.v)
				if (m.dist === 0) { // Android 在 touchend 之前会产生一个位移为 0 的 touchmove
					if (m.dt > this.FLICK_TIME_THRESHOLD) touch.flick = null
				} else {
					touch.flick = m.v > this.FLICK_VELOCITY_THRESHOLD ? m : null
				}
			} else {
				touch.flick = null
			}
		},
		ontouchcancel: noop
	}
	function GestureDetector(settings) {
		this.overrideSettings(settings)
	}
	Object.defineProperties(GestureDetector.prototype, {
		ontouchstart: {value: noop},
		ontouchend: {value: noop},
		ontouchmove: {value: noop},
		ontouchcancel: {value: noop},
		overrideSettings: {value: function(settings){
			for (var key in settings) {
				this.settings[key] = settings[key]
			}
		}}
	})
	Object.defineProperties(GestureDetector, {
		tap: {value: new TapDetector()},
		pan: {value: PanDetector},
		flick: {value: FlickDetector}
	})

	//detectGesture(window, ['tap', 'flick', 'pan'])

	win.Zhi = Touch

}(window)