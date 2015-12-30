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
	    faint  = "#404060",
	    white  = "#FFFFFF";

	var defaults = {
		bgFillColor : "#000000",
		bgImage : false,
		debug : false,
		debugSelector : "#debug",
		baseHref : "",
		frameRateMin : 8,
		frameRateMax : 20,
		stepIntervalMin : 40,
		stepIntervalMax : 30,
		rocketIntervalMin : 6,
		rocketIntervalMax : 3,
		frameCacheSize : 20, // number of frames to generate in advance
		drag : 0.01, // velocity lost per frame
		gravity : 0.5, // downward acceleration
		wind : -0.1, // horizontal slide applied to everything each frame
		preload : [], // URLs to load before allowing animation to start
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
			rocket    : [faint],
			explosion : [yellow, white],
			core      : [orange, yellow, blue, white, moss],
			shell     : [green, red, orange, tan, green, white, white, white, sky, blue],
			ring      : [red, orange, white, sky, tan],
			logo      : [blue, green, orange, sky]
		},
		spotlightColors : [
			"#050528",
			"#0F051E",
			"#050F1E"
		],
		fov : 500,
		pxScale: 1,
		particleDensityMax : 2.00,
		particleDensityMin : 0.25,
		startCallback : null,
		stepCallback : null,
		burnoutModMin : 5,
		burnoutModMax : 100,
		delayTimeline : false
	};

	var vars = {
		frameRate : 20, // frames per second
		frameInterval : 50, // ms between rendered frames
		frameStartTime : null,
		timeDelta : 1, // time elapsed per frame
		stepInterval : 20, // ticks between timeline steps
		rocketInterval : 3, // ticks between rockets in the same step
		lastStepTick : 0, // tick of last timeline step
		lastRocketTick : 0, // tick of last rocket step
		imgs : {}, // loaded sprites
		loading : 0, // images not yet loaded from server
		particles : [], // all particles ever created
		spareParticles : [], // particles ready to be reused
		tick : 0, // one per rendered frame
		step : 0, // one per timeline event
		rocket : false, // index in the current step
		timer : null, // from setInterval
		stopped : false,
		particleDensity : 1,
		frameCache : [],
		stepCache : [],
		latency : 0,
		burnoutMod : 100, // modulo for early burnout. higher number allows particles to last longer.
		renderQuality : 100, // on a scale of 0-100
		renderQualityAcc : 0,
		renderQualityCt : 0,
		renderQualityAvg : 100,
		startTime : null
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
		$.extend(this, defaults, options, vars); // Allow opts to override the defaults
		this.spotlightStyles = this.spotlightColors.map(function(c){return "rgba("+hexToRgb(c)+",0.2)"});
		this.loadSprites(); // blocks animation while loading sprites
	};

	Fireworks.prototype.initCanvas = function(canvas) {
		// This is the canvas that the user sees.
		this.displayCanvas = canvas;
		this.displayCanvas.width = this.displayCanvas.clientWidth * this.pxScale;
		this.displayCanvas.height = this.displayCanvas.clientHeight * this.pxScale;
		this.w2 = this.displayCanvas.clientWidth / 2;
		this.h2 = this.displayCanvas.clientHeight / 2;
		this.displayContext = this.displayCanvas.getContext("2d");

		// This canvas holds the background.
		this.bgCanvas = document.createElement("canvas");
		this.bgCanvas.width = this.displayCanvas.width;
		this.bgCanvas.height = this.displayCanvas.height;
		this.bgContext = this.bgCanvas.getContext("2d");
		if ( this.bgFillColor ) {
			this.bgContext.fillStyle = "rgba("+hexToRgb(this.bgFillColor)+",1)";
			this.bgContext.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
		}
		if ( this.bgImage ) {
			// Todo: stretch to fit
			var bg = new Image();
			++this.loading;
			var self = this;
			bg.onload = function() {
				--self.loading;
				self.bgContext.drawImage(bg, 0, 0, self.bgCanvas.width, self.bgCanvas.height);
				self.fadeFrame();
			};
			bg.src = this.applyBaseHref(this.bgImage);
		} else {
			this.fadeFrame();
		}
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
		this.frameDueTime = false;
		var self = this;
		if ( this.preload.length ) {
			$.map(this.preload, function(url) {
				++self.loading;
				var img = new Image();
				img.src = self.applyBaseHref(url);
				img.onload = function() { --self.loading; };
			});
		}
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

	Fireworks.prototype.applyBaseHref = function(url) {
		if ( !url.match(/^\//) )
			url = this.baseHref + url;
		return url;
	};

	Fireworks.prototype.loadSprites = function() {
		var self = this;
		$.each(this.sprites, function(name, url) {
			++self.loading;
			var img = new Image();
			img.src = self.applyBaseHref(url);
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
			self.rasters[name].src = self.applyBaseHref(url);
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

	Fireworks.prototype.launchRocket = function(data) {
		var fireworks = this;
		this.getParticle({
			scale: .15,
			streak: 5,
			pos: new Vector3(Math.random() * 100 - 50, 260, Math.random() * 4 - 2),
			vel: new Vector3(Math.random() * 10 - 5, Math.random() * 5 - 23, Math.random() * 3),
			img: this.imgs.rocket.random(),
			data: data,
			expendable: false,
			cont: function(particle) {
				// Continue while rising
				if ( particle.vel.y < -1.5 )
					return true;
				// Spawn explosions
				particle.streak = false;
				fireworks.explodeCore(particle.pos, particle.data[0]);
				fireworks.explodeShell(particle.pos, particle.data[1], particle);
				fireworks.explodeRing(particle.pos, particle.data[2], particle);
				// Become bright, expand, contract, fade away
				particle.img = fireworks.imgs.explosion.random();
				particle.vel = new Vector3(0, 0, 0);
				particle.grav = 0.1;
				var x = Math.max(Math.sqrt(particle.data[0]) / 20, 0.25);
				particle.scales = [2,4,6,5,4,3,2,0].map(function(s){return s*x;});
				particle.cont = function(particle) { return particle.scale = particle.scales.shift(); };
				return true;
			}
		});
	};

	Fireworks.prototype.explodeShell = function(pos, mag, op) {
		if ( mag <= 0 )
			return;
		var fireworks = this;
		var root = Math.sqrt(mag) + 1;
		var vel = new Vector3(root, root, root);
		var scale = 0.15 + Math.random() * 0.1;
		var cont = function(p) { p.streak = 6; fireworks.decrementTimer(p); return p.timer > 0 || Math.random() > 0.25; }
		var imgs = [];
		do {
			imgs.push(this.imgs.shell.random());
		} while ( Math.random() > 0.7 );
		var numP = 10 + this.scaleParticleCount(mag * 2);
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
				timer: 21,
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
				timer: 21,
				x2d: op.x2d,
				y2d: op.y2d
			});
		}
	};

	Fireworks.prototype.explodeRing = function(pos, mag, op) {
		if ( mag <= 0 )
			return;
		var fireworks = this;
		var root = Math.sqrt(mag) * 0.8 + 1;
		var vel = new Vector3(root, 0, root);
		var cont = function(p) { p.streak = 8; fireworks.decrementTimer(p); return p.timer > 0 || Math.random() > 0.25; }
		var rX = 1 - 2 * Math.random();
		var rZ = 1 - 2 * Math.random();
		var scale = 0.15 + Math.random() * 0.1;
		var img = this.imgs.ring.random();
		var numP = 4 + this.scaleParticleCount(mag);
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
				timer: 20,
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
				timer: 20,
				x2d: op.x2d,
				y2d: op.y2d
			});
		}
	};

	Fireworks.prototype.explodeCore = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var fireworks = this;
		var root = Math.sqrt(mag) / 3;
		var vel = new Vector3(root, root, root);
		var cont = function(p) { fireworks.decrementTimer(p); return p.timer > 0 || Math.random() > 0.25; }
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
		var fireworks = this;
		var root = Math.sqrt(mag);
		var cont = function(p) { fireworks.decrementTimer(p); return p.timer > 0 || Math.random() > 0.25; };
		// convert raster into array of particles
		var canvas = document.createElement("canvas");
		var c = canvas.getContext("2d");
		var raster = this.rasters[name];
		c.drawImage(raster, 0, 0, raster.width, raster.height);
		var imageData = id = c.getImageData(0, 0, raster.width, raster.height);
		var i = 0, halfx = raster.width / 2, halfy = raster.height / 2, x, y, vx, vy;
		var rx = Math.random() / 2 - 0.25, ry = Math.random() / 2 - 0.25, rz = Math.random() / 2 - 0.25;
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
		return min + this.qualityScalar * ( max - min );
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
		this.context.beginPath();
		this.context.moveTo(Math.floor(this.canvas.width / 3), this.canvas.height);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + this.pxScale * 200 * Math.sin(this.tick / 19)), 0);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + this.pxScale * (200 * Math.sin(this.tick / 19) + 100)), 0);
		this.context.lineTo(Math.floor(this.canvas.width / 3 + this.pxScale * 15), this.canvas.height);
		this.context.fillStyle = this.spotlightStyles[0];
		this.context.fill();
		this.context.beginPath();
		this.context.moveTo(Math.floor(2 * this.canvas.width / 3), this.canvas.height);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + this.pxScale * (180 * Math.sin(this.tick / 23) - 100)), 0);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + this.pxScale * 180 * Math.sin(this.tick / 23)), 0);
		this.context.lineTo(Math.floor(2 * this.canvas.width / 3 + this.pxScale * 15), this.canvas.height);
		this.context.fillStyle = this.spotlightStyles[1];
		this.context.fill();
		this.context.beginPath();
		this.context.moveTo(Math.floor(2 * this.canvas.width / 3) + this.pxScale * 40, this.canvas.height);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + this.pxScale * (180 * Math.sin(this.tick / 29) - 100)), 0);
		this.context.lineTo(Math.floor(this.canvas.width / 2 + this.pxScale * 180 * Math.sin(this.tick / 29)), 0);
		this.context.lineTo(Math.floor(2 * this.canvas.width / 3) + this.pxScale * 55, this.canvas.height);
		this.context.fillStyle = this.spotlightStyles[2];
		this.context.fill();
	};

	Fireworks.prototype.draw3Din2D = function(particle) {
		if ( particle.scale > 0 ) {
			var mult = 6; // magic number
			var scale = this.fov / ( this.fov + particle.pos.z );
			var x2d = this.pxScale * (( particle.pos.x * scale) + this.w2);
			var y2d = this.pxScale * (( particle.pos.y * scale) + this.h2);
			if ( particle.x2d === false ) {
				// If particle was just spawned, estimate the previous postion for blur
				var scaleOld = this.fov / ( this.fov + particle.pos.z - particle.vel.z );
				particle.x2d = this.pxScale * (( particle.pos.x - particle.vel.x ) * scaleOld + this.w2);
				particle.y2d = this.pxScale * (( particle.pos.y - particle.vel.y ) * scaleOld + this.h2);
			}
			// Think of transforms as LIFO: the first one called is the last one applied.
			this.context.translate(x2d, y2d); // 5: move the particle into position
			this.context.scale(scale, scale); // 4: scale for distance (pos.z)
			// Motion blur
			if ( particle.streak && !this.isMouseDown ) {
				var dx = x2d - particle.x2d;
				var dy = y2d - particle.y2d;
				var angle = Math.atan2( dy, dx );
				if ( angle < 0 )
					angle += Math.PI * 2;
				var distance = Math.sqrt( Math.pow( dx, 2 ) + Math.pow( dy, 2 ) );
				this.context.rotate(angle); // 3: rotate to direction of motion
				this.context.translate(- distance / 2, 0); // 2: move center backward along direction of motion
				this.context.scale(1 + distance / mult * particle.streak, 1); // 1: scale by 2d projected distance
			}
			this.context.globalAlpha = particle.alpha;
			// draw image centered at origin
			var scaleMult = particle.scale * mult * this.pxScale;
			this.context.drawImage(particle.img, - scaleMult, - scaleMult, 2 * scaleMult, 2 * scaleMult);
			// reset to identity matrix
			this.context.setTransform(1, 0, 0, 1, 0, 0);
			// save 2D projection coords for streak
			particle.x2d = x2d;
			particle.y2d = y2d;
		}
	};

	Fireworks.prototype.nextTick = function() {
		var inDelay = false;
		if ( this.delayTimeline > 0 ) {
			if ( this.frameStartTime < this.startTime + this.delayTimeline )
				inDelay = true;
			else
				this.delayTimeline = false;
		}
		if ( !inDelay && this.rocket === false && this.tick >= this.lastStepTick + this.stepInterval ) {
			this.rocket = 0;
			this.stepCache.push( this.step );
		} else {
			this.stepCache.push( false );
		}
		while ( this.rocket !== false && this.tick >= this.lastRocketTick + this.rocketInterval ) {
			var step = this.timeline[this.step];
			if ( typeof step[this.rocket] == "object" ) {
				this.launchRocket( step[this.rocket] );
				this.lastRocketTick = this.tick - ( this.rocket % 3 );
			}
			++this.rocket;
			if ( typeof step[this.rocket] == "undefined" ) {
				this.rocket = false;
				this.step = ++this.step % this.timeline.length; // loop
				this.lastStepTick = this.tick;
			}
		}
		++this.tick;
	};

	Fireworks.prototype.render = function() {
		this.frameStartTime = (new Date()).getTime();
		var self = this;
		if ( this.loading > 0 ) {
			setTimeout(function(){self.render();}, 5);
			return;
		}
		if ( this.frameDueTime === false )
			this.frameDueTime = (new Date()).getTime() + 100;
		if ( this.frameCache.length >= this.frameCacheSize ) {
			this.nextFrame();
			setTimeout(function(){self.render();}, 5);
			return;
		}
		if ( typeof this.startCallback == "function" ) {
			var delay = parseInt(this.startCallback.call(this));
			this.startCallback = null;
			if ( delay > 0 ) {
				setTimeout(function(){self.render();}, delay);
				return;
			}
		}
		if ( this.startTime === null )
			this.startTime = this.frameStartTime;
		this.nextFrame();
		this.nextTick();
		// If the frame we're drawing is already late then skip the cache.
		var pushFrame = true;
		if ( this.frameCache.length == 0 && this.frameStartTime >= this.frameDueTime ) {
			pushFrame = false;
			this.canvas = this.displayCanvas;
			this.context = this.displayContext;
			this.fadeFrame();
			this.frameDueTime = this.frameStartTime + this.frameInterval;
		} else {
			this.newCanvas();
		}
		this.nextFrame();
		this.context.globalCompositeOperation = "lighter";
		// Draw particles (unsorted because order is irrelevant in "lighter" mode)
		//this.particles.sort(this.compareZPos);
		this.timeDelta = Math.sqrt( this.frameRateMax / this.frameRate );
		for (i = 0; i < this.particles.length; i++) {
			// Periodically check whether the next frame is due.
			if ( pushFrame ) // && i % 5 == 0 )
				this.nextFrame();
			// Particles burn out at a faster rate when the cache is thin.
			if ( this.particles[i].expendable && (i + this.tick) % this.burnoutMod == 0 ) {
				this.particles[i].disable();
			} else {
				this.particles[i].update(this.timeDelta, i);
				if ( this.particles[i].enabled )
					this.draw3Din2D(this.particles[i]);
			}
		}
		this.context.globalAlpha = 1;
		this.nextFrame();
		this.drawSpotlights();
		this.nextFrame();
		if ( pushFrame ) {
			this.frameCache.push( this.canvas );
		} else {
			this.doStepCallback();
		}

		this.nextFrame();
		setTimeout(function(){self.render();}, 1);
	};

	Fireworks.prototype.doStepCallback = function() {
		var step = this.stepCache.shift();
		if ( step !== false ) {
			if ( typeof this.stepCallback == "function" )
				this.stepCallback.call(this, step);
		}
	};

	Fireworks.prototype.fadeFrame = function() {
		// Fade the previous frame
		this.displayContext.globalCompositeOperation = "source-over";
		this.displayContext.globalAlpha = 0.4;
		this.displayContext.drawImage(this.bgCanvas, 0, 0, this.displayCanvas.width, this.displayCanvas.height);
	};

	Fireworks.prototype.nextFrame = function() {
		if ( this.stopped || !this.frameDueTime )
			return;
		var time = (new Date()).getTime();
		var late = time - this.frameDueTime;
		// Better to render a tiny bit early than very late.
		if ( late < -2 )
			return;
		this.latency = Math.max(0, late);
		if ( this.frameCache.length == 0 )
			return;
		// Slow and simplify the animation when the cache is thin
		this.updateRenderQuality();
		this.fadeFrame();
		// Add the next frame
		this.displayContext.globalCompositeOperation = "lighter";
		this.displayContext.globalAlpha = 1;
		this.displayContext.drawImage( this.frameCache.shift(), 0, 0 );
		this.doStepCallback();
		this.frameDueTime = time + this.frameInterval - Math.min(late, 10);
	};

	Fireworks.prototype.updateRenderQuality = function() {
		this.renderQualityAcc += this.renderQuality;
		this.renderQualityCt += 1;
		this.renderQualityAvg = this.renderQualityAcc / this.renderQualityCt;
		if ( this.tick > 10 ) {
			var newQ = ( this.frameCache.length * 1.25 ) / this.frameCacheSize * 100;
			if ( this.tick > 50 && newQ < this.renderQuality ) {
				this.renderQuality = newQ;
			} if ( this.latency > this.frameInterval / 8 ) {
				this.renderQuality = Math.max( 1, this.renderQuality - Math.min(10, this.latency) );
			} else {
				if ( this.renderQualityAvg > this.renderQuality )
					this.renderQuality += Math.max( 0.1, ( ( 100 + this.renderQualityAvg ) / 2 - this.renderQuality ) / 50 );
				else
					this.renderQuality = Math.min( 100, this.renderQuality + 0.1 );
			}
		}
		// The quality curve falls rapidly off the maximum. 90 => 0.81; 80 => 0.64; 50 => 0.25; 20 => 0.04
		this.qualityScalar = Math.pow( this.renderQuality / 100, 2 );
		this.frameRate = this.scaleByQuality(this.frameRateMin, this.frameRateMax);
		this.frameInterval = parseInt( 1000 / this.frameRate );
		this.particleDensity = this.scaleByQuality( this.particleDensityMin, this.particleDensityMax );
		this.burnoutMod = parseInt( this.scaleByQuality( this.burnoutModMin, this.burnoutModMax ) );
		this.stepInterval = parseInt( this.scaleByQuality( this.stepIntervalMin, this.stepIntervalMax ) );
		this.rocketInterval = parseInt( this.scaleByQuality( this.rocketIntervalMin, this.rocketIntervalMax ) );
		if ( this.debug )
			this.showDebug();
	};

	Fireworks.prototype.decrementTimer = function(particle) {
		particle.timer -= this.timeDelta;
	};

	Fireworks.prototype.showDebug = function() {
		$(this.debugSelector).html(
			"<table>"
				+ $.map(
					[["frameCache", (new Array(this.frameCache.length + 1)).join("|"), "frames"],
					 ["frameRate", parseInt(this.frameRate), "fps"],
					 ["frameInterval", this.frameInterval, "ms"],
					 ["latency", this.latency, "ms"],
					 ["particles", (this.particles.length - this.spareParticles.length) + "/" + this.particles.length, "active/max"],
					 ["particleDensity", parseInt(this.particleDensity * 50), "%"],
					 ["particleBurnout", "1/" + parseInt(this.burnoutMod), "per frame"],
					 ["stepInterval", this.stepInterval, "frames"],
					 ["rocketInterval", this.rocketInterval, "frames"],
					 ["renderQuality", parseInt(this.renderQuality * 100) / 100, "%"],
					 ["renderQualityAvg", parseInt(this.renderQualityAvg * 100) / 100, "%"]
					],
					function(d) { return "<tr><td>" + d[0] + "</td><td style='text-align:right;width:6em'>" + d[1] + "</td><td>" + d[2] + "</td></tr>"; }
				).join("")
				+ "</table>");
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
		streak: false,
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

	Particle.prototype.update = function(delta, i) {
		if (this.enabled) {
			if ( this.cont(this) ) {
				while ( delta > 0 ) {
					var mult = delta >= 1 ? 1 : delta;
					this.pos.plusEq(this.vel.copy().multiplyEq(mult));
					this.vel.multiplyEq((1 - this.fireworks.drag * mult) * this.drag);
					this.vel.y += this.fireworks.gravity * this.grav * mult;
					this.pos.x += this.fireworks.wind * mult;
					delta -= 1;
				}
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
