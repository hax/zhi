//heshijun@baixing.com
//主要用于调试移动设备
void function(w){
	'use strict'

	var logMethods = ['log', 'debug', 'info', 'warn', 'error']
	var consoleMethods = [
		'assert', 'count', 'dir', 'dirxml',
		'group', 'groupCollapsed', 'groupEnd',
		'time', 'timeEnd', 'trace'
	].concat(logMethods)

	var simpleLog = /\bAndroid\b/.test(navigator.userAgent) &&
		!/\bChrome\b/.test(navigator.userAgent) &&
		!/\bFirefox\b/.test(navigator.userAgent)

	if (!simpleLog) {
		consoleMethods.forEach(function(method){
			if (method in console) {
				w['$' + method] = function(){
					console[method].apply(console, arguments)
				}
			} else {
				if (method === 'groupCollapsed') w.$groupCollapsed = w.$group
				else {
					console.warn('console.' + method + ' is not supported.')
					w['$' + method] = noop
				}
			}
		})
	} else {

		void function(){

			logMethods.forEach(function(level){
				w['$' + level] = function () {
					if (arguments.length > 0) doLog(level, arguments)
				}
			})

			w.$assert = function (test) {
				invokeConsole('assert', arguments)
				if (!test) {
					arguments[0] = 'Assertion failed:'
					doLog('error', arguments)
				}
			}

			var counters = {}
			w.$count = function (label) {
				invokeConsole('count', arguments)
				if (!(label in counters)) counters[label] = 1
				else counters[label]++
				doLog('log', [label + ': ' + counters[label]])
			}

			var timers = {}
			w.$time = function (label) {
				invokeConsole('time', arguments)
				timers[label] = Date.now()
				doLog('log', [label + ': timer started'])
			}
			w.$timeEnd = function (label) {
				invokeConsole('timeEnd', arguments)
				if (label in timers) {
					console.log(groupOffset(label + ': ' + (Date.now() - timers[label]) + 'ms'))
					delete timers[label]
				}
			}

			var groupLevels = 0
			w.$group = w.$groupCollapsed = function () {
				invokeConsole('group', arguments)
				doLog('log', arguments)
				groupLevels++
			}
			w.$groupEnd = function () {
				invokeConsole('groupEnd', arguments)
				if (groupLevels > 0) groupLevels--
			}

			function doLog(level, args) {
				invokeConsole(level, [groupOffset(format(args))])
			}

			function groupOffset(s) {
				return new Array(groupLevels + 1).join('|\t') + s
			}

		}()
	}

	function invokeConsole(method, args) {
		if (typeof console === 'object' && typeof console[method] === 'function') {
			return console[method].apply(console, args)
		}
	}

	function format(args) {
		if (typeof args[0] === 'string') {
			var i = 0
			var s = args[0].replace(/%./g, function(m){
				if (i >= args.length) return m
				switch (m) {
					case '%s':
						var x = args[++i];
						return x
					case '%d': case '%i':
						var x = args[++i];
						return typeof x === 'number' ? Math.floor(x) : NaN
					case '%f':
						var x = args[++i];
						return typeof x === 'number' ? x : NaN
					case '%o':
						var x = args[++i];
						return formatNode(x)
					case '%O':
						var x = args[++i];
						return formatObject(x)
					default:
						return m
				}
			})
			args = [].slice.call(args, i)
			args[0] = s
		}
		return join(args)
	}

	function formatNode(e) {
		if (!('nodeType' in e)) return formatObject(e)
		switch (e.nodeType) {
			case 1:
				var s = '<' + e.tagName
				var classList = e.className.replace(/^\s+/, '').replace(/\s+$/, '').split(/\s+/)
				if (classList.length > 0) s += '.' + classList.join('.')
				if (e.id) s += '#' + e.id
			default:
				return e.nodeName
		}
	}

	function formatObject(o) {
		return String(o)
	}

	function join(args, sep) {
		return [].join.call(args, sep || ' ')
	}

	function noop() {}

}(window)

/*
function $log() {
	if (console && typeof console.log === 'function') {
		if (/Android/.test(navigator.userAgent))
			console.log([].join.call(arguments, ' '))
		else console.log.apply(console, arguments)
	}
	$log.buffer.push(Date.now(), [].join.call(arguments, ' '))
}
$log.buffer = []

var DEBUG_OUTPUT_PANEL_ID = 'debug-output'
setInterval(function(){
	var e = document.getElementById(DEBUG_OUTPUT_PANEL_ID)
	if (!e) {
		if (document.body) {
			e = document.createElement('pre')
			e.id = DEBUG_OUTPUT_PANEL_ID
			e.className = 'mini'
			document.body.appendChild(e)
			$log(getComputedStyle(e).pointerEvents)
			e.addEventListener('click', function(evt){
				switch (this.className) {
					case 'compact': this.className = 'mini'; break
					case 'mini': this.className = ''; break
					default: this.className = 'compact'
				}
				//evt.preventDefault()
				//evt.stopPropagation()
			})
		}
	} else if ($log.buffer.length > 0) {

		var s = '<p>'
		for (var i = 0; i < $log.buffer.length; i += 2) {
			if (i > 1 && $log.buffer[i] - $log.buffer[i - 2] > 1000) s += '<p>'
			s += ($log.buffer[i] + ': ').slice(-5) + $log.buffer[i + 1].replace(/</g, '&lt;') + '<br>'
		}
		$log.buffer = []
		e.innerHTML += s
		e.scrollTop = e.scrollHeight - e.offsetHeight
	}
}, 100)*/

window.addEventListener('error', function(err){
	$error(err)
	//alert(err)
})

window.addEventListener('load', function(evt){
	$debug(evt.target.nodeName, 'loaded')
}, false)

/*$group('ES5:')
$log('defineProperty' in Object)
$log('keys' in Object)
$log('create' in Object)
$groupEnd()*/

$groupCollapsed('navigator:')
Object.keys(navigator).forEach(function(k){
	var v = navigator[k]
	if (typeof v !== 'function')
		$info(k + ':', v)
})
$groupEnd()

//Object.keys(navigator).map(function(k){$log(k, navigator[k])})

var timers = []

//alert(navigator.userAgent)

/*console.group('log levels')
console.log('log', 1)
console.debug('debug', 1)
console.info('info', 1)
console.warn('warn', 1)
console.error('error', 1)
console.groupEnd('log levels')
console.dir({x:1})
console.dirxml('<a>Test</a>')
console.trace()
console.assert(true, 'ok')
console.assert(false, 'fail')
console.count('counter')
console.count('counter')
console.time('t')
console.timeEnd('t')*/

