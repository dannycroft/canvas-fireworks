/*======================================================
  Heavily inspired by Seb Lee-Delisle' talk @fullfrontal 2010
  Ref - http://bit.ly/fgUay5
  ========================================================*/
/*
  Made from:
  https://github.com/dannycroft/canvas-fireworks/tree/6c463ef786dc0655bf871ddc87bb2ef7850ff859
*/

(function( $ ) {
	var defaults = {
		renderInterval : 40, // ms between rendered frames
		stepInterval : 10, // ticks between timeline steps
		drag : 0.01, // velocity lost per frame
		gravity : 0.5, // downward acceleration
		wind : -0.2, // horizontal slide applied to everything each frame
		sprites : { // images used in animation
			rocket   : "img/electric.png",
			explosion: "img/spark.png",
			core     : "img/spark.png",
			shell    : "img/star.png",
			ring     : "img/electric.png"
		},
		fov : 300,
		imgs : {}, // loaded sprites
		loading : 0,
		particles : [], // all particles ever created
		spareParticles : [], // particles ready to be reused
		tick : 0, // one per rendered frame
		step : 0, // one per timeline event
		timer : null,
	};

	var Fireworks = function(options) {
		$.extend(true, this, defaults, options); // Allow opts to override the vars above
		this.loadSprites(); // blocks animation while loading sprites
	};

	var methods = {
		init : function( options ) {
			return this.each(function(){
				var $this = $(this);console.log($this);
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

	Fireworks.prototype.loadSprites = function() {
		var self = this;
		$.each(this.sprites, function(name, url) {
			++self.loading;
			var img = new Image();
			img.src = url;
			img.onload = function() { --self.loading; };
			self.imgs[name] = img;
		});
	};

	Fireworks.prototype.launchRocket = function(data) {
		if ( !data )
			return;
		opts={
			pos: new Vector3((Math.random() * 100) - 50, 190, 0),
			vel: new Vector3((Math.random() * 10) - 5, (Math.random() * 3) - 18, (Math.random() * 6) - 3),
			img: this.imgs.rocket,
			data: data,
			cont: function(particle) {
				// Continue while rising
				if ( particle.vel.y < 0 )
					return true;
				// Spawn explosion particles
				particle.fireworks.explodeCore(particle.pos, particle.data[0]);
				particle.fireworks.explodeShell(particle.pos, particle.data[1]);
				particle.fireworks.explodeRing(particle.pos, particle.data[2]);
				// Become bright, expand, contract, fade away
				particle.img = particle.fireworks.imgs.explosion;
				particle.vel = new Vector3(0, 0, 0);
				particle.grav = 0.1;
				particle.drag = 0.8;
				var x = Math.sqrt(particle.data[0]) / 10;
				particle.scales = [1,2,3,4,5,5,4,4,3,3,2,2,0].map(function(s){return s*x;});
				particle.cont = function(particle) { return particle.scale = particle.scales.shift(); };
				return true;
			}
		};
		this.getParticle(opts);
	};

	Fireworks.prototype.explodeShell = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag);
		var vel = new Vector3(root, root, root);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.3; }
		// Spawn a symmetrical pair of particles for each unit magnitude
		for ( var i = 0; i < mag; ++i ) {
			vel.rotate(Math.random(), Math.random(), Math.random());
			var myVel = vel.copy().multiplyEq( (Math.random() + 19) / 20);
			this.getParticle({
				pos: pos.copy(),
				vel: myVel,
				grav: 0.2,
				drag: 0.9,
				cont: cont,
				img: this.imgs.shell,
				timer: 20,
			});
			this.getParticle({
				pos: pos.copy(),
				vel: myVel.invert(),
				grav: 0.2,
				drag: 0.9,
				cont: cont,
				img: this.imgs.shell,
				timer: 20,
			});
		}
	};

	Fireworks.prototype.explodeRing = function(pos, mag) {
		if ( mag <= 0 )
			return;
		var root = Math.sqrt(mag);
		var vel = new Vector3(root, 0, root);
		var cont = function(p) { return --p.timer > 0 || Math.random() > 0.3; }
		var rX = 1 - 2 * Math.random();
		var rZ = 1 - 2 * Math.random();
		for ( var i = 0; i < mag; ++i ) {
			vel.rotateY(Math.random());
			var myVel = vel.copy().rotateX(rX).rotateZ(rZ).multiplyEq( 1.5 + Math.random() / 5 );
			this.getParticle({
				pos: pos.copy(),
				vel: myVel,
				grav: 0.2,
				drag: 0.9,
				cont: cont,
				img: this.imgs.ring,
				scale: 0.7,
				timer: 20,
			});
			this.getParticle({
				pos: pos.copy(),
				vel: myVel.invert(),
				grav: 0.2,
				drag: 0.9,
				cont: cont,
				img: this.imgs.ring,
				scale: 0.7,
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
		for ( var i = 0; i < mag; ++i ) {
			vel.rotate(Math.random(), Math.random(), Math.random());
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

	Fireworks.prototype.draw3Din2D = function(particle) {
		var scale = this.fov / ( this.fov + particle.pos.z );
		var x2d = ( particle.pos.x * scale) + this.canvas.width / 2;
		var y2d = ( particle.pos.y * scale) + this.canvas.height / 2;
		scale *= 6 * particle.scale;
		if (scale > 0)
			this.context.drawImage(particle.img, x2d - scale, y2d - scale, scale * 2, scale * 2);
	};

	Fireworks.prototype.render = function() {
		if ( this.loading > 0 )
			return;
		var i;
		if ( this.tick % this.stepInterval == 0 ) {
			for ( i = 0; i < this.timeline[this.step].length; ++i )
				this.launchRocket(this.timeline[this.step][i]);
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
				this.draw3Din2D(particle);
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
})( jQuery );