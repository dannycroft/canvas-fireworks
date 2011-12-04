/*======================================================
  Heavily inspired by Seb Lee-Delisle' talk @fullfrontal 2010
  Ref - http://bit.ly/fgUay5
  ========================================================*/
/*
  Made from:
  https://github.com/dannycroft/canvas-fireworks/tree/6c463ef786dc0655bf871ddc87bb2ef7850ff859
*/

(function( $ ) {
	var orange = "#FA5600",
	    tan    = "#DBC170",
	    red    = "#E01309",
	    green  = "#A0AF28",
	    moss   = "#003D04",
	    sky    = "#0051A4",
	    blue   = "#1010FF",
	    yellow = "#FFFF00",
	    white  = "#FFFFFF";

	var defaults = {
		renderInterval : 50, // ms between rendered frames
		stepInterval : 10, // ticks between timeline steps
		drag : 0.01, // velocity lost per frame
		gravity : 0.5, // downward acceleration
		wind : -0.2, // horizontal slide applied to everything each frame
		sprites : { // images used in animation
			rocket    : "img/electric.png",
			explosion : "img/spark.png",
			core      : "img/spark.png",
			shell     : "img/star.png",
			ring      : "img/electric.png"
		},
		spriteColors : {
			rocket    : [blue, white, moss],
			explosion : [yellow, white],
			core      : [orange, yellow, blue, white, moss],
			shell     : [green, red, orange, tan, green, white, white, white, sky, blue],
			ring      : [red, orange, white],
		},
		fov : 400,
		imgs : {}, // loaded sprites
		loading : 0,
		particles : [], // all particles ever created
		spareParticles : [], // particles ready to be reused
		tick : 0, // one per rendered frame
		step : 0, // one per timeline event
		timer : null,
	};

	var methods = {
		init : function( options ) {
			return this.each(function(){
				var $this = $(this);
				var fireworks = new Fireworks(options);
				$this.data("fireworks", fireworks);
				fireworks.initCanvas(this);
			});
		},
		start : function() {
			return this.each(function(){
				$(this).data("fireworks").start();
			});
		},
		stop : function() {
			return this.each(function(){
				$(this).data("fireworks").stop();
			});
		}
	};

	function Fireworks(options) {
		$.extend(true, this, defaults, options); // Allow opts to override the vars above
		this.loadSprites(); // blocks animation while loading sprites
	};

	Fireworks.prototype.initCanvas = function(canvas) {
		this.canvas = canvas;
		this.context = this.canvas.getContext("2d");
		return this;
	};

	Fireworks.prototype.start = function() {
		var self = this;
		this.timer = setInterval(function() {
			self.render();
		}, this.renderInterval);
		return this;
	};

	Fireworks.prototype.stop = function() {
		clearInterval(this.timer);
		return this;
	};

	/**
	 * Converts HSV to RGB value.
	 *
	 * @param {Integer} h Hue as a value between 0 - 360 degrees
	 * @param {Integer} s Saturation as a value between 0 - 100 %
	 * @param {Integer} v Value as a value between 0 - 100 %
	 * @returns {Array} The RGB values  EG: [r,g,b], [255,255,255]
	 */
	function hsvToRgb(h,s,v) {
		var s = s / 100,
		v = v / 100;
		var hi = Math.floor((h/60) % 6);
		var f = (h / 60) - hi;
		var p = v * (1 - s);
		var q = v * (1 - f * s);
		var t = v * (1 - (1 - f) * s);
		var rgb = [];
		switch (hi) {
		case 0: rgb = [v,t,p];break;
		case 1: rgb = [q,v,p];break;
		case 2: rgb = [p,v,t];break;
		case 3: rgb = [p,q,v];break;
		case 4: rgb = [t,p,v];break;
		case 5: rgb = [v,p,q];break;
		}
		var r = Math.min(255, Math.round(rgb[0]*256)),
		g = Math.min(255, Math.round(rgb[1]*256)),
		b = Math.min(255, Math.round(rgb[2]*256));
		return [r,g,b];
	}	

	/**
	 * Converts RGB to HSV value.
	 *
	 * @param {Integer} r Red value, 0-255
	 * @param {Integer} g Green value, 0-255
	 * @param {Integer} b Blue value, 0-255
	 * @returns {Array} The HSV values EG: [h,s,v], [0-360 degrees, 0-100%, 0-100%]
	 */
	function rgbToHsv(r, g, b) {
		var r = (r / 255),
		g = (g / 255),
  		b = (b / 255);	
		var min = Math.min(Math.min(r, g), b),
		max = Math.max(Math.max(r, g), b),
		delta = max - min;
		var value = max,
		saturation,
		hue;
		// Hue
		if (max == min) {
			hue = 0;
		} else if (max == r) {
			hue = (60 * ((g-b) / (max-min))) % 360;
		} else if (max == g) {
			hue = 60 * ((b-r) / (max-min)) + 120;
		} else if (max == b) {
			hue = 60 * ((r-g) / (max-min)) + 240;
		}
		if (hue < 0) {
			hue += 360;
		}
		// Saturation
		if (max == 0) {
			saturation = 0;
		} else {
			saturation = 1 - (min/max);
		}
		return [Math.round(hue), Math.round(saturation * 100), Math.round(value * 100)];
	}

	function hexToRgb(hex) {
		hex = hex.replace(/^#/, '');
		var r = parseInt("0x" + hex.substr(0,2));
		var g = parseInt("0x" + hex.substr(2,2));
		var b = parseInt("0x" + hex.substr(4,2));
		return [r, g, b];
	}

	function hexToHsv(hex) {
		return rgbToHsv.apply({}, hexToRgb(hex));
	}

	Fireworks.prototype.loadSprites = function() {
		var self = this;
		$.each(this.sprites, function(name, url) {
			++self.loading;
			var img = new Image();
			img.src = url;
			img.onload = function() {
				if ( typeof self.imgs[name] != "object" )
					self.imgs[name] = [];
				self.varySprite(name, img);
				--self.loading;
			};
		});
	};

	Fireworks.prototype.varySprite = function(name, img) {
		var canvas = document.createElement('canvas'), c=canvas.getContext('2d');
		canvas.width = img.width;
		canvas.height = img.height;
		c.drawImage(img, 0, 0);
		var imageData = c.getImageData(0, 0, img.width, img.height);
		var pix = imageData.data.length / 4;
		var pixHsv = [], sat = 0;
		for ( var p = 0; p < pix; ++p ) {
			var i = p * 4;
			pixHsv[p] = rgbToHsv(imageData.data[i], imageData.data[i+1], imageData.data[i+2]);
			if ( pixHsv[p][1] > sat )
				sat = pixHsv[p][1];
		}
		var colors = this.spriteColors[name];
		for ( var color = 0; color < colors.length; ++color ) {
			var colorHsv = hexToHsv(colors[color]);
			for ( p = 0; p < pix; ++p ) {
				var rgb = hsvToRgb(colorHsv[0], colorHsv[1] * pixHsv[p][1] / sat, colorHsv[2] * pixHsv[p][2] / 100);
				i = p * 4;
				imageData.data[i] = rgb[0];
				imageData.data[i+1] = rgb[1];
				imageData.data[i+2] = rgb[2];
			}
			canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			c = canvas.getContext('2d');
			c.putImageData(imageData, 0, 0);
			this.imgs[name].push(canvas);
			for ( p = 0; p < pix; ++p ) {
				var rgb = hsvToRgb(colorHsv[0], colorHsv[1] * pixHsv[p][1] / sat, (200 + colorHsv[2] * pixHsv[p][2] / 100) / 3);
				i = p * 4;
				imageData.data[i] = rgb[0];
				imageData.data[i+1] = rgb[1];
				imageData.data[i+2] = rgb[2];
			}
			canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			c = canvas.getContext('2d');
			c.putImageData(imageData, 0, 0);
			this.imgs[name].push(canvas);
		}
	}

	Fireworks.prototype.launchRocket = function(idx) {
		opts={
			scale: Math.round(Math.random() * 3) / 6,
			pos: new Vector3((Math.random() * 100) - 50, 190, 0),
			vel: new Vector3((Math.random() * 10) - 5, (Math.random() * 5) - 20, (Math.random() * 6) - 3),
			img: this.imgs.rocket.random(),
			data: this.timeline[ this.step ][ idx ],
			cont: function(particle) {
				// Continue while rising
				if ( particle.vel.y < 0 )
					return true;
				// Spawn explosion particles
				particle.fireworks.explodeCore(particle.pos, particle.data[0]);
				particle.fireworks.explodeShell(particle.pos, particle.data[1]);
				particle.fireworks.explodeRing(particle.pos, particle.data[2]);
				// Become bright, expand, contract, fade away
				particle.img = particle.fireworks.imgs.explosion.random();
				particle.vel = new Vector3(0, 0, 0);
				particle.grav = 0;
				var x = Math.sqrt(particle.data[0]) / 10;
				particle.scales = [1,2,4,5,5,5,4,4,4,3,3,2,2,0].map(function(s){return s*x;});
				particle.cont = function(particle) { return particle.scale = particle.scales.shift(); };
				return true;
			}
		};
		this.getParticle(opts);
	};

	Fireworks.prototype.explodeShell = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag) + 1;
		var vel = new Vector3(root, root, root);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.3; }
		var imgs = [];
		imgs[0] = this.imgs.shell.random();
		if ( Math.random() > 0.8 )
			imgs[1] = this.imgs.shell.random();
		// Spawn a symmetrical pair of particles for each unit magnitude
		for ( var i = 0; i < mag * 3; ++i ) {
			vel.rotate(Math.random() * 3, Math.random() * 3, Math.random() * 3);
			var myVel = vel.copy().multiplyEq( (Math.random() + 19) / 20);
			this.getParticle({
				pos: pos.copy(),
				vel: myVel,
				grav: 0.4,
				drag: 0.9,
				cont: cont,
				img: imgs.random(),
				timer: 20,
			});
			this.getParticle({
				pos: pos.copy(),
				vel: myVel.invert(),
				grav: 0.4,
				drag: 0.9,
				cont: cont,
				img: imgs.random(),
				timer: 20,
			});
		}
	};

	Fireworks.prototype.explodeRing = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag) + 1;
		var vel = new Vector3(root, 0, root);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.3; }
		var rX = 1 - 2 * Math.random();
		var rZ = 1 - 2 * Math.random();
		var img = this.imgs.ring.random();
		for ( var i = 0; i < mag * 2; ++i ) {
			vel.rotateY(Math.random() * 3);
			var myVel = vel.copy().rotateX(rX).rotateZ(rZ).multiplyEq( 1.5 + Math.random() / 5 );
			this.getParticle({
				pos: pos.copy(),
				vel: myVel,
				grav: 0.4,
				drag: 0.92,
				cont: cont,
				img: img,
				scale: 0.5,
				timer: 20,
			});
			this.getParticle({
				pos: pos.copy(),
				vel: myVel.invert(),
				grav: 0.4,
				drag: 0.92,
				cont: cont,
				img: img,
				scale: 0.5,
				timer: 20,
			});
		}
	};

	Fireworks.prototype.explodeCore = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag) / 3;
		var vel = new Vector3(root, root, root);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.3; }
		for ( var i = 0; i < mag / 2; ++i ) {
			vel.rotate(Math.random() * 3, Math.random() * 3, Math.random() * 3);
			var myVel = vel.copy().multiplyEq( Math.random() / 2 + .25);
			this.getParticle({
				pos: pos.copy(),
				vel: myVel,
				grav: 0.2,
				drag: 0.93,
				cont: cont,
				img: this.imgs.core,
				scale: 0.6,
				timer: 20,
			});
			this.getParticle({
				pos: pos.copy(),
				vel: myVel.invert(),
				grav: 0.2,
				drag: 0.93,
				cont: cont,
				img: this.imgs.core,
				scale: 0.6,
				timer: 20,
			});
		}
	};

	Fireworks.prototype.getParticle = function(opts) {
		var particle;
		if (this.spareParticles.length == 0) {
			opts.fireworks = this;
			particle = new Particle(opts);
			this.particles.push(particle);
		} else {
			particle = this.spareParticles.shift();
			particle.reset(opts);
		}
		return particle;
	};

	Fireworks.prototype.draw3Din2D = function(particle, idx) {
		var scale = this.fov / ( this.fov + particle.pos.z );
		var x2d = ( particle.pos.x * scale) + this.canvas.width / 2;
		var y2d = ( particle.pos.y * scale) + this.canvas.height / 2;
		scale *= 6 * particle.scale;
		if ( typeof idx != "number" )
			idx = 0;
		if ( particle.img.length )
			var img = particle.img[ idx % particle.img.length ];
		else
			var img = particle.img;
		if (scale > 0)
			this.context.drawImage(img, x2d - scale, y2d - scale, scale * 2, scale * 2);
	};

	Fireworks.prototype.render = function() {
		if ( this.loading > 0 )
			return;
		var i;
		if ( this.tick % this.stepInterval == 0 ) {
			for ( i = 0; i < this.timeline[this.step].length; ++i )
				this.launchRocket(i);
			this.step = ++this.step % this.timeline.length; // loop
		}
		++this.tick;
		// Fade the previous frame
		this.context.fillStyle = "rgba(0,0,0,0.3)";
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		// Draw from farthest to nearest
		this.particles.sort(this.compareZPos);
		var particle;
		for (i = 0; i < this.particles.length; i++) {
			particle = this.particles[i];
			particle.update();
			if ( particle.enabled )
				this.draw3Din2D(particle, i);
		}
	};

	Fireworks.prototype.compareZPos = function(a, b) {
		return (b.pos.z - a.pos.z)
	};

	function Vector3(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	Vector3.prototype.rotateX = function(angle) {
		var tz = this.z;
		var ty = this.y;
		var cosRX = Math.cos(angle);
		var sinRX = Math.sin(angle);
		this.z = (tz * cosRX) + (ty * sinRX);
		this.y = (tz * -sinRX) + (ty * cosRX);
		return this;
	};

	Vector3.prototype.rotateY = function(angle) {
		var tx = this.x;
		var tz = this.z;
		var cosRY = Math.cos(angle);
		var sinRY = Math.sin(angle);
		this.x = (tx * cosRY) + (tz * sinRY);
		this.z = (tx * -sinRY) + (tz * cosRY);
		return this;
	};

	Vector3.prototype.rotateZ = function(angle) {
		var ty = this.y;
		var tx = this.x;
		var cosRZ = Math.cos(angle);
		var sinRZ = Math.sin(angle);
		this.y = (ty * cosRZ) + (tx * sinRZ);
		this.x = (ty * -sinRZ) + (tx * cosRZ);
		return this;
	};

	Vector3.prototype.rotate = function(ax, ay, az) {
		this.rotateX(ax).rotateY(ay).rotateZ(az);
		return this;
	};

	Vector3.prototype.plusEq = function(v) {
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		return this;
	};

	Vector3.prototype.multiplyEq = function(s) {
		this.x *= s;
		this.y *= s;
		this.z *= s;
		return this;
	};

	Vector3.prototype.invert = function() {
		return new Vector3(0-this.x, 0-this.y, 0-this.z);
	};

	Vector3.prototype.copy = function() {
		return new Vector3(0+this.x, 0+this.y, 0+this.z);
	};

	Vector3.prototype.magnitude = function() {
		return Math.sqrt( Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2) );
	};

	function Particle(opts) {
		this.reset(opts);
		return this;
	}

	Particle.prototype.defaults = {
		grav: 1,
		drag: 1,
		enabled: true,
		data: null,
		scale: 1,
		cont: function(particle) {
			return particle.enabled;
		}
	};

	Particle.prototype.reset = function(opts) {
		$.extend(this, this.defaults, opts);
	};

	Particle.prototype.update = function() {
		if (this.enabled) {
			if ( this.cont(this) ) {
				this.pos.plusEq(this.vel);
				this.vel.multiplyEq((1 - this.fireworks.drag) * this.drag);
				this.vel.y += this.fireworks.gravity * this.grav;
				this.pos.x += this.fireworks.wind;
			} else {
				this.enabled = false;
				this.fireworks.spareParticles.push(this);
			}
		}
	};

	$.fn.fireworks = function( method ) {
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.fireworks' );
		}
	};

	if ( typeof Array.prototype.random == "undefined" ) {
		Array.prototype.random = function(fun) {
			var rand, idx;
			if ( this.length == 0 )
				return;
			if ( this.length == 1 )
				return this[0];
			if ( typeof fun == "function" )
				rand = fun.apply();
			else
				rand = Math.random();
			idx = Math.floor( rand * this.length );
			return this[ idx ];
		};
	}
})( jQuery );
