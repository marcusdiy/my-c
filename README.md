# `<my-c><my-c/>` - My Component | ES5 compatible components

Usage example
 MYC.register('test', { 
  registered: function() { alert('registered'); },
  connected: function(el) { el.innerHTML += new Date(); },
  styles: '.myc-test {font-size: 30px; color: red; background: #FFF}'
})
<my-c class="myc-test"></my-c> to use the test component
