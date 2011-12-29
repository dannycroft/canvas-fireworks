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
		debug : true,
		frameRateMin : 12.5,
		frameRateMax : 20,
		frameInterval : 50, // ms between rendered frames
		stepIntervalMin : 60,
		stepIntervalMax : 20,
		stepInterval : 20, // ticks between timeline steps
		lastStepTick : -100, // tick of last timeline step
		frameCacheSize : 20, // number of frames to generate in advance
		drag : 0.01, // velocity lost per frame
		gravity : 0.5, // downward acceleration
		wind : -0.2, // horizontal slide applied to everything each frame
		sprites : { // images used in animation
			rocket    : "img/electric.png",
			explosion : "img/spark.png",
			core      : "img/spark.png",
			shell     : "img/electric.png",
			ring      : "img/electric.png",
			logo      : "img/star.png",
		},
		rasters : { // pixel maps to generate 2D fireworks arrays
			logo      : "img/w.png"
		},
		spriteColors : {
			rocket    : [white],
			explosion : [yellow, white],
			core      : [orange, yellow, blue, white, moss],
			shell     : [green, red, orange, tan, green, white, white, white, sky, blue],
			ring      : [red, orange, white, sky, tan],
			logo      : [blue, green, orange, sky]
		},
		fov : 500,
		imgs : {}, // loaded sprites
		loading : 0,
		particles : [], // all particles ever created
		spareParticles : [], // particles ready to be reused
		tick : 0, // one per rendered frame
		step : 0, // one per timeline event
		timer : null, // from setInterval
		stopped : false,
		particleDensityMax : 2.00,
		particleDensityMin : 0.25,
		particleDensity : 1,
		frameCache : [],
		frameCacheIndex : 0,
		startCallback : null,
		burnoutMod : 100, // modulo for early burnout. higher number allows particles to last longer.
		renderQuality : 100, // on a scale of 0-100
		renderQualityAcc : 0,
		renderQualityCt : 0,
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
		},
		pause : function() {
			return this.each(function(){
				$(this).data("fireworks").pause();
			});
		}
	};

	function Fireworks(options) {
		$.extend(true, this, defaults, options); // Allow opts to override the defaults
		this.loadSprites(); // blocks animation while loading sprites
	};

	Fireworks.prototype.initCanvas = function(canvas) {
		// This is the canvas that the user sees.
		this.displayCanvas = canvas;
		this.displayCanvas.width = this.displayCanvas.clientWidth;
		this.displayCanvas.height = this.displayCanvas.clientHeight;
		this.w2 = this.displayCanvas.width / 2;
		this.h2 = this.displayCanvas.height / 2;
		this.displayContext = this.displayCanvas.getContext("2d");

/*
		var self = this;
		$(canvas).bind('mousedown.fireworks', function() {self.isMouseDown = true;});
		$(window).bind('mousemove.fireworks', function(e) {self.mouseX = e.pageX - self.canvas.offsetLeft - self.w2;});
		$(window).bind('mouseup.fireworks', function() {self.isMouseDown = false;});
		this.lastMouseX = 0;
		this.mouseX = 0;
*/
		return this;
	};

	Fireworks.prototype.newCanvas = function() {
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.displayCanvas.width;
		this.canvas.height = this.displayCanvas.height;
		this.context = this.canvas.getContext("2d");
	};

	Fireworks.prototype.start = function() {
		this.stopped = false;
		this.frameDueTime = (new Date()).getTime() + 100;
		var self = this;
		this.timer = setInterval(function(){self.nextFrame()}, 1);
		setTimeout(function(){self.render()}, 50);
		return this;
	};

	Fireworks.prototype.stop = function() {
		this.stopped = true;
		clearInterval(this.timer);
		return this;
	};

	Fireworks.prototype.pause = function() {
		if ( this.stopped )
			this.start();
		else
			this.stop();
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
		$.each(this.rasters, function(name, url) {
			++self.loading;
			self.rasters[name] = new Image();
			self.rasters[name].src = url;
			self.rasters[name].onload = function() {
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
		var fireworks = this;
		this.getParticle({
			scale: .15,
			stretch: 5,
			pos: new Vector3(Math.random() * 100 - 50, Math.random() * 3 + 190, Math.random() * 4 - 2),
			vel: new Vector3(Math.random() * 12 - 6, Math.random() * 6 - 20, Math.random() * 6 - 3),
			img: this.imgs.rocket.random(),
			data: this.timeline[ this.step ][ idx ],
			expendable: false,
			cont: function(particle) {
				// Continue while rising
				if ( particle.vel.y < -1.5 )
					return true;
				// Spawn explosions
				particle.stretch = false;
				fireworks.explodeCore(particle.pos, particle.data[0]);
				fireworks.explodeShell(particle.pos, particle.data[1], particle);
				fireworks.explodeRing(particle.pos, particle.data[2], particle);
				// Become bright, expand, contract, fade away
				particle.img = fireworks.imgs.explosion.random();
				particle.vel = new Vector3(0, 0, 0);
				particle.grav = 0.1;
				var x = Math.max(Math.sqrt(particle.data[0]) / 20, 0.25);
				particle.scales = [2,4,5,5,4,4,3,3,2,2,0].map(function(s){return s*x;});
				particle.cont = function(particle) { return particle.scale = particle.scales.shift(); };
				return true;
			}
		});
	};

	Fireworks.prototype.explodeShell = function(pos, mag, op) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag) + 1;
		var vel = new Vector3(root, root, root);
		var scale = 0.15 + Math.random() * 0.1;
		var cont = function(p) { p.stretch = 6; return --p.timer > 0 || Math.random() > 0.25; }
		var imgs = [];
		do {
			imgs.push(this.imgs.shell.random());
		} while ( Math.random() > 0.7 );
		var numP = this.scaleParticleCount(20 + mag * 2);
		var myPos = new Vector3(pos.x, pos.y, pos.z);
		// Spawn a symmetrical pair of particles at a time
		for ( var i = 0; i < numP; i += 2 ) {
			vel.rotate(Math.random() * 6, Math.random() * 6, Math.random() * 6);
			var myVel = vel.copy().multiplyEq( (Math.random() + 19) / 20);
			this.getParticle({
				scale: scale,
				pos: myPos.copy(),
				vel: myVel,
				grav: 0.3,
				drag: 0.92,
				cont: cont,
				img: imgs.random(),
				timer: 23,
				x2d: op.x2d,
				y2d: op.y2d
			});
			this.getParticle({
				scale: scale,
				pos: myPos.copy(),
				vel: myVel.invert(),
				grav: 0.3,
				drag: 0.91,
				cont: cont,
				img: imgs.random(),
				timer: 23,
				x2d: op.x2d,
				y2d: op.y2d
			});
		}
	};

	Fireworks.prototype.explodeRing = function(pos, mag, op) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag) * 0.8 + 1;
		var vel = new Vector3(root, 0, root);
		var cont = function(p) { p.stretch = 8; return --p.timer > 0 || Math.random() > 0.25; }
		var rX = 1 - 2 * Math.random();
		var rZ = 1 - 2 * Math.random();
		var scale = 0.15 + Math.random() * 0.1;
		var img = this.imgs.ring.random();
		var numP = this.scaleParticleCount(mag);
		var myPos = new Vector3(pos.x, pos.y, pos.z);
		for ( var i = 0; i < numP; ++i ) {
			vel.rotateY(Math.random() * 3);
			var myVel = vel.copy().rotateX(rX).rotateZ(rZ).multiplyEq( 1.5 + Math.random() / 5 );
			this.getParticle({
				pos: myPos.copy(),
				vel: myVel,
				grav: 0.3,
				drag: 0.91,
				cont: cont,
				img: img,
				scale: scale,
				timer: 23,
				x2d: op.x2d,
				y2d: op.y2d
			});
			this.getParticle({
				pos: myPos.copy(),
				vel: myVel.invert(),
				grav: 0.3,
				drag: 0.91,
				cont: cont,
				img: img,
				scale: scale,
				timer: 23,
				x2d: op.x2d,
				y2d: op.y2d
			});
		}
	};

	Fireworks.prototype.explodeCore = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag) / 3;
		var vel = new Vector3(root, root, root);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.25; }
		var numP = 2 + this.scaleParticleCount(mag / 20);
		for ( var i = 0; i < numP; ++i ) {
			vel.rotate(Math.random() * 3, Math.random() * 3, Math.random() * 3);
			var myVel = vel.copy().multiplyEq( Math.random() / 2 + .25);
			this.getParticle({
				pos: pos.copy(),
				vel: myVel,
				grav: 0.2,
				drag: 0.93,
				cont: cont,
				img: this.imgs.core[0],
				imgs: this.imgs.core,
				scale: 0.6,
				timer: 23,
			});
			this.getParticle({
				pos: pos.copy(),
				vel: myVel.invert(),
				grav: 0.2,
				drag: 0.93,
				cont: cont,
				img: this.imgs.core[0],
				imgs: this.imgs.core,
				scale: 0.6,
				timer: 23,
			});
		}
	};

	Fireworks.prototype.explodeRaster = function(name, pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.25; };
		// convert raster into array of particles
		var canvas = document.createElement("canvas");
		var c = canvas.getContext("2d");
		var raster = this.rasters[name];
		c.drawImage(raster, 0, 0, raster.width, raster.height);
		var imageData = id = c.getImageData(0, 0, raster.width, raster.height);
		var i = 0, halfx = raster.width / 2, halfy = raster.height / 2, x, y, vx, vy;
		var rx = Math.random() - 0.5, ry = Math.random() - 0.5, rz = Math.random() - 0.5;
		var img = this.imgs[name].random();
		for ( var row = 0; row < raster.height; ++row ) {
			y = row - halfy;
			for ( var col = 0; col < raster.width; ++col ) {
				if ( imageData.data[i+3] > 127 ) {
					x = col - halfx;
					this.getParticle({
						pos: new Vector3(pos.x + x / 10, pos.y + y / 10, pos.z),
						vel: (new Vector3(x, y, 0)).multiplyEq(root / 10 + Math.random() / 10).rotate(rx, ry, rz),
						grav: .4,
						drag: .9,
						cont: cont,
						img: img,
						scale: 1,
						timer: 23,
						expendable: false,
					});
				}
				i += 4;
			}
		}
	};

	Fireworks.prototype.scaleParticleCount = function(c) {
		return c * this.particleDensity;
	};

	Fireworks.prototype.scaleByQuality = function(min, max) {
		return min + this.renderQuality * ( max - min ) / 100;
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

	Fireworks.prototype.drawSpotlights = function() {
		// Draw some spotlights on the sky
		this.context.beginPath();
		this.context.moveTo(Math.floor(this.canvas.width / 3), this.canvas.height);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + 200 * Math.sin(this.tick / 19)), 0);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + 200 * Math.sin(this.tick / 19) + 100), 0);
		this.context.lineTo(Math.floor(this.canvas.width / 3 + 15), this.canvas.height);
		this.context.fillStyle = "rgba(5,5,40,0.2)";
		this.context.fill();
		this.context.beginPath();
		this.context.moveTo(Math.floor(2 * this.canvas.width / 3), this.canvas.height);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + 180 * Math.sin(this.tick / 23)) - 100, 0);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + 180 * Math.sin(this.tick / 23)), 0);
		this.context.lineTo(Math.floor(2 * this.canvas.width / 3 + 15), this.canvas.height);
		this.context.fillStyle = "rgba(15,5,30,0.2)";
		this.context.fill();
		this.context.beginPath();
		this.context.moveTo(Math.floor(2 * this.canvas.width / 3) + 40, this.canvas.height);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + 180 * Math.sin(this.tick / 29)) - 100, 0);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + 180 * Math.sin(this.tick / 29)), 0);
		this.context.lineTo(Math.floor(2 * this.canvas.width / 3) + 55, this.canvas.height);
		this.context.fillStyle = "rgba(5,15,30,0.2)";
		this.context.fill();
	};

	Fireworks.prototype.draw3Din2D = function(particle) {
		if ( particle.scale > 0 ) {
			var mult = 6;
			var scale = this.fov / ( this.fov + particle.pos.z );
			var x2d = ( particle.pos.x * scale) + this.w2;
			var y2d = ( particle.pos.y * scale) + this.h2;
			if ( particle.x2d === false ) {
				// If particle was just spawned, estimate the previous postion for blur
				var scaleOld = this.fov / ( this.fov + particle.pos.z - particle.vel.z );
				particle.x2d = ( particle.pos.x - particle.vel.x ) * scaleOld + this.w2;
				particle.y2d = ( particle.pos.y - particle.vel.y ) * scaleOld + this.h2;
			}
			// Think of transforms as LIFO: the first one called is the last one applied.
			this.context.translate( x2d, y2d ); // 5: move the particle into position
			this.context.scale(scale, scale); // 4: scale for distance (pos.z)
			// Motion blur
			if ( particle.stretch && !this.isMouseDown ) {
				var dx = x2d - particle.x2d;
				var dy = y2d - particle.y2d;
				var angle = Math.atan2( dy, dx );
				if ( angle < 0 )
					angle += Math.PI * 2;
				var distance = Math.sqrt( Math.pow( dx, 2 ) + Math.pow( dy, 2 ) );
				this.context.rotate(angle); // 3: rotate to direction of motion
				this.context.translate(- distance / 2, 0); // 2: move center backward along direction of motion
				this.context.scale(1 + distance / mult * particle.stretch, 1); // 1: scale by 2d projected distance
			}
			this.context.globalAlpha = particle.alpha;
			// draw image centered at origin
			var scaleMult = particle.scale * mult;
			this.context.drawImage(particle.img, - scaleMult, - scaleMult, 2 * scaleMult, 2 * scaleMult);
			// reset to identity matrix
			this.context.setTransform(1, 0, 0, 1, 0, 0);
			// save 2D projection coords for stretch
			particle.x2d = x2d;
			particle.y2d = y2d;
		}
	};

	Fireworks.prototype.render = function() {
		var frameStartTime = (new Date()).getTime();
		var self = this;
		if ( this.loading > 0 ) {
			this.frameDueTime = (new Date()).getTime() + 100;
			setTimeout(function(){self.render();}, 5);
			return;
		}
		if ( this.frameCache.length >= this.frameCacheSize ) {
			this.nextFrame();
			setTimeout(function(){self.render();}, 5);
			return;
		}
		if ( typeof this.startCallback == "function" ) {
			var delay = parseInt(this.startCallback.call());
			this.startCallback = null;
			if ( delay > 0 ) {
				setTimeout(function(){self.render();}, delay);
				return;
			}
		}
		this.nextFrame();
		if ( this.tick >= this.lastStepTick + this.stepInterval ) {
			for ( var i = 0; i < this.timeline[this.step].length; ++i )
				this.launchRocket(i);
			this.step = ++this.step % this.timeline.length; // loop
			this.lastStepTick = this.tick;
		}
		++this.tick;
		// If the frame we're drawing is already late then skip the cache.
		var pushFrame = true;
		if ( this.frameCache.length == 0 && frameStartTime >= this.frameDueTime ) {
			pushFrame = false;
			this.canvas = this.displayCanvas;
			this.context = this.displayContext;
			this.fadeFrame();
			this.frameDueTime = frameStartTime + this.frameInterval;
		} else {
			this.newCanvas();
		}
		this.context.globalCompositeOperation = "lighter";
		// Draw particles (unsorted because order is irrelevant in "lighter" mode)
		//this.particles.sort(this.compareZPos);
		for (i = 0; i < this.particles.length; i++) {
			// Periodically check whether the next frame is due.
			if ( pushFrame ) // && i % 5 == 0 )
				this.nextFrame();
			// Particles burn out at a faster rate when the cache is thin.
			if ( this.particles[i].expendable && (i + this.tick) % this.burnoutMod == 0 ) {
				this.particles[i].disable();
			} else {
				this.particles[i].update(i);
				if ( this.particles[i].enabled )
					this.draw3Din2D(this.particles[i]);
			}
		}
		this.context.globalAlpha = 1;
		this.drawSpotlights();
		if ( pushFrame )
			this.frameCache.push( this.canvas );
		this.nextFrame();
		setTimeout(function(){self.render();}, 1);
		this.renderQualityAcc += this.renderQuality;
		this.renderQualityCt += 1;
	};

	Fireworks.prototype.fadeFrame = function() {
		// Fade the previous frame
		this.displayContext.globalCompositeOperation = "source-over";
		this.displayContext.fillStyle = "rgba(0,0,0,0.25)";
		this.displayContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
	};

	Fireworks.prototype.nextFrame = function() {
		if ( this.stopped )
			return;
		var time = (new Date()).getTime();
		var late = time - this.frameDueTime;
		// Better to render a tiny bit early than very late.
		if ( late < -2 )
			return;
		if ( this.debug ) $("#debug").html("cache " + (new Array(this.frameCache.length + 1)).join("|"));
		if ( this.debug ) $("#debug2").html("late " + (new Array(parseInt(Math.max(0, late + 1)))).join("|"));
		if ( this.frameCache.length == 0 )
			return;
		// Slow and simplify the animation when the cache is thin
		this.updateRenderQuality(late);
		if ( this.debug ) $("#debug3").html("frameInterval " + this.frameInterval + "<br>density " + this.particleDensity + "<br>burnout " + this.burnoutMod + "<br>stepInterval " + this.stepInterval + "<br>renderQuality " + this.renderQuality + "<br>avgRenderQuality " + (this.renderQualityAcc/this.renderQualityCt));
		this.fadeFrame();
		// Add the next frame
		this.displayContext.globalCompositeOperation = "lighter";
		this.displayContext.drawImage( this.frameCache.shift(), 0, 0 );
		this.frameDueTime = time + this.frameInterval - Math.min(late, 10);
	};

	Fireworks.prototype.updateRenderQuality = function(late) {
		var newQ = parseInt( this.frameCache.length / ( this.frameCacheSize - 2 ) * 100 );
		if ( late > 5 )
			this.renderQuality = Math.max( 1, this.renderQuality - Math.min(10, late) );
		else if ( this.tick < 50 )
			null;
		else if ( newQ < this.renderQuality )
			this.renderQuality = newQ;
		else
			this.renderQuality = Math.min( 100, this.renderQuality + Math.max( 0.2, (100 - this.renderQuality) / 50 ) );
		this.frameInterval = parseInt( 1000 / this.scaleByQuality(this.frameRateMin, this.frameRateMax) );
		this.particleDensity = this.scaleByQuality( this.particleDensityMin, this.particleDensityMax );
		this.burnoutMod = parseInt( this.scaleByQuality( 10, 100 ) );
		this.stepInterval = parseInt( this.scaleByQuality( this.stepIntervalMin, this.stepIntervalMax ) );
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
		pos: {},
		vel: {},
		grav: 1,
		drag: 1,
		enabled: true,
		data: null,
		scale: 1,
		x2d: false,
		y2d: false,
		stretch: false,
		imgs: false,
		expendable: true,
		alpha: 1,
		cont: function(particle) {
			return particle.enabled;
		}
	};

	Particle.prototype.reset = function(opts) {
		$.extend(this, this.defaults, opts);
		// Particles moving away from observer should appear less bright
		if ( this.vel.z > 0 )
			this.alpha = 1 - ( this.vel.z / this.vel.magnitude() * .75 );
	};

	Particle.prototype.update = function(i, cont) {
		if (this.enabled) {
			if ( cont || this.cont(this) ) {
				this.pos.plusEq(this.vel);
				this.vel.multiplyEq((1 - this.fireworks.drag) * this.drag);
				this.vel.y += this.fireworks.gravity * this.grav;
				this.pos.x += this.fireworks.wind;
				if ( typeof this.imgs == 'object' )
					this.img = this.imgs[ i % this.imgs.length ];
			} else {
				this.disable(true);
			}
		}
	};

	Particle.prototype.disable = function(force) {
		if (this.enabled && ( this.expendable || force ) ) {
			this.enabled = false;
			this.fireworks.spareParticles.push(this);
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
