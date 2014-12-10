## zhi ##

触摸和指点设备手势库

### Usage ###

```html
<script src="zhi.js">
<script>
var containerElement = document.getElementById('ground')
Zhi.detectGesture(containerElement, ['tap', 'pan-x'])

var targetElement = document.getElementById('ball')
targetElement.addEventListener('tap', function(){
	alert('Oops!')
})
targetElement.addEventListener('pan', function(event){
	console.log(event.motion)
})
</script>
```

### Support gestures and events ###

* Tap
* Pan
* Flick
