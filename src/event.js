void function(w){
	'use strict'

	/*if (!('CustomEvent' in w)) {
		$debug('patch CustomEvent')
		w.CustomEvent = function CustomEvent(type, evtInitDict) {
			var evt = w.document.createEvent('CustomEvent')
			evt.initCustomEvent(type, 
				evtInitDict.bubbles, 
				evtInitDict.cancelable, 
				evtInitDict.detail)
			return evt
		}
	}*/

	function patchEventConstructor(name, sampleEventType, initArgs, defaultValues) {
		if (name in w) {
			try {
				new w[name](sampleEventType, {})
				return false
			} catch(e) {}
		}

		var old = w[name]

		try {
			document.createEvent(name)
			w[name] = function (type, initDict) {
				var event = document.createEvent(name)
				var args = [type].concat(initArgs.map(function(key, i){
					return key in initDict ? initDict[key] : defaultValues[i]
				}))
				event['init' + name].apply(event, args)
				return event
			}
		} catch(e) {
			w[name] = function (type, initDict) {
				var event = document.createEvent('Event')
				var args = [type].concat(initArgs.map(function(key, i){
					return key in initDict ? initDict[key] : defaultValues[i]
				}))
				event.initEvent.apply(event, args)
				for (var key in initDict) {
					event[key] = initDict[key]
				}
				return event
			}
		}
		if (old) w[name].prototype = old.prototype
		return true
	}

	var Initializers = {}
	Initializers.Event = {
		args: ['bubbles', 'cancelable'],
		defaults: [false, false],
		sampleType: 'test'
	}
	Initializers.CustomEvent = {
		args: Initializers.Event.args.concat(['detail']),
		defaults: Initializers.Event.defaults.concat([null]),
		sampleType: 'test'
	}
	Initializers.UIEvent = {
		args: Initializers.Event.args.concat(['view', 'detail']),
		defaults: Initializers.Event.defaults.concat([null, 0]),
		sampleType: 'test'
	}
	Initializers.FocusEvent = {
		args: Initializers.UIEvent.args.concat(['relatedTarget']),
		defaults: Initializers.UIEvent.defaults.concat([null]),
		sampleType: 'test'
	}
	Initializers.MouseEvent = {
		args: Initializers.UIEvent.args.concat(['screenX', 'screenY', 'clientX', 'clientY',
			'ctrlKey', 'shiftKey', 'altKey', 'metaKey', 'button', 'buttons', 'relatedTarget']),
		defaults: Initializers.UIEvent.defaults.concat([0, 0, 0, 0, false, false, false, false, 0, 0, null]),
		sampleType: 'click'
	}
	Initializers.WheelEvent = {
		args: Initializers.MouseEvent.args.concat(['deltaX', 'deltaY', 'deltaZ', 'deltaMode']),
		defaults: Initializers.MouseEvent.defaults.concat([0.0, 0.0, 0.0, 0]),
		sampleType: 'test'
	}
	/*
	Initializers.KeyboardEvent = {
		args: Initializers.UIEvent.args.concat(['key', 'location',
			'ctrlKey', 'shiftKey', 'altKey', 'metaKey', 'repeat', 'locale', 'charCode', 'keyCode', 'which']),
		defaults: Initializers.UIEvent.defaults.concat(['', 0, false, false, false, false, false, '', 0, 0, 0])
	}
	Initializers.CompositionEvent = {

	}
	*/

	$group('patch Event contructors')
	for (var name in Initializers) {
		var z = Initializers[name]
		if (patchEventConstructor(name, z.sampleType, z.args, z.defaults))
			$log('patch ' + name)
	}
	$groupEnd()

}(window)
