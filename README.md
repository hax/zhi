== zhi ==

触摸和指点设备手势库

=== Usage ===

```javascript
var containerElement = document.getElementById('ground')
Zhi.detectGesture(containerElement, ['tap', 'pan'])

var targetElement = document.getElementById('ball')
ball.addEventListener('tap', function(){
	alert('Oops!')
})
ball.addEventListener('pan', function(event){
	console.log(event.motion)
})
```