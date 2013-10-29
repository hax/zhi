void function(win){
	'use strict'

	var Touch = {
		version: '0.1',
		detectGesture: detectGesture
	}

	//tap, dbltap, hold
	//pan, drag, swipe/slide, flick/fling, pinch/stretch/spread, turn/rotate

	function detectGesture(e, gestures) {

		var detectors = []
		var panDir = 0

		for (var i = 0; i < gestures.length; i++) {
			var g = gestures[i]
			if (g instanceof GestureDetector) detectors.push(g)
			else if (typeof g === 'string') {
				if (g === 'pan') {
					panDir = Direction.ANY
					continue
				}
				if (g.slice(0, 4) === 'pan-') {
					var dir = g.slice(4).toUpperCase()
					if (dir in Direction) {
						panDir |= Direction[dir]
						continue
					}
				}
				if (g in GestureDetector) {
					detectors.push(GestureDetector[g])
					continue
				}
				$error('unknown gesture: ', g)
			}
			else $error('argument type mismatch: ', g)
		}

		if (panDir) {
			$debug('pan dir:', panDir)
			var d
			switch (panDir) {
				case Direction.ANY:
					d = GestureDetector.pan
					break
				case Direction.X:
					d = GestureDetector.panX
					break
				case Direction.Y:
					d = GestureDetector.panY
					break
				default:
					d = new PanDetector({direction: panDir})
			}
			detectors.push(d)
		}

		var touches = {}

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


	var DEG15 = Math.PI / 12
	function Direction(angle) {
		var i = angle / DEG15 % 24
		if (i < 0) i += 24
		return 1 << Math.floor(i) | 1 << Math.ceil(i)
	}
	Object.defineProperties(Direction, {
		12: {value: 0x40},
		11: {value: 0x100},
		10: {value: 0x400},
		9: {value: 0x1000},
		8: {value: 0x4000},
		7: {value: 0x10000},
		6: {value: 0x40000},
		5: {value: 0x100000},
		4: {value: 0x400000},
		3: {value: 0x1},
		2: {value: 0x4},
		1: {value: 0x10},
		UP: {value: 0x1f0},
		RIGHT: {value: 0xc00007},
		DOWN: {value: 0x1f0000},
		LEFT: {value: 0x7c00},
		X: {value: 0xc07c07},
		Y: {value: 0x1f01f0},
		ANY: {value: -1},
		NONE: {value: 0}
	})

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
		v: {get: function(){ return this.dist / this.dt }},
		angle: {get: function(){ return Math.atan2(this.dy, this.dx) }},
		dir: {get: function(){ return Direction(this.angle) }}
	})

	function TouchGestureEvent(type, initDict){
		var evt = new win.UIEvent(type, initDict)
		evt.motion = initDict.motion
		return evt
	}
	TouchGestureEvent.prototype = win.UIEvent.prototype


	var noop = function(){}

	function GestureDetector(settings) {
		this.settings = Object.create(this.defaultSettings)
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

	function TapDetector(settings) {
		GestureDetector.call(this, settings)
	}
	TapDetector.prototype = Object.create(GestureDetector.prototype, {
		defaultSettings: {value: {
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
					if (e.defaultPrevented === false ||
						e.defaultPrevented === undefined && e.returnValue !== false // Android 2.x bug: no defaultPrevented attr
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

	function PanDetector(settings) {
		GestureDetector.call(this, settings)
	}
	PanDetector.prototype = Object.create(GestureDetector.prototype, {
		defaultSettings: {value:{
			direction: Direction.ANY,
		}},
		ontouchmove: {value: function(evt, touches){
			if (evt.touches.length === 1) {
				var touch = touches[evt.changedTouches[0].identifier]
				var m = new Motion(touch.start, touch.moves[touch.moves.length - 1])
				if (touch.moves.length === 1) {
					$debug(m.dir, this.settings.direction)
					if (m.dir & this.settings.direction) {
						var e = new TouchGestureEvent('panstart', {
							bubbles: true,
							cancelable: true,
							motion: m
						})
						evt.target.dispatchEvent(e)
						if (!e.defaultPrevented) {
							touch.pan = m
							evt.preventDefault()
						}
						return
					}
				} else if (touch.pan) {
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
		}},
		ontouchend: {value: function(evt, touches){
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
		}},
	})
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
	//detectGesture(window, ['tap', 'flick', 'pan'])

	Object.defineProperties(GestureDetector, {
		tap: {value: new TapDetector()},
		pan: {value: new PanDetector()},
		panX: {value: new PanDetector({direction: Direction.X})},
		panY: {value: new PanDetector({direction: Direction.Y})},
		flick: {value: FlickDetector}
	})


	win.Zhi = Touch

}(window)