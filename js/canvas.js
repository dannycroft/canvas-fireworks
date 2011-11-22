/*======================================================
  Heavily inspired by Seb Lee-Delisle' talk @fullfrontal 2010
  Ref - http://bit.ly/fgUay5
  ========================================================*/
/*
  Made from:
  https://github.com/dannycroft/canvas-fireworks/tree/6c463ef786dc0655bf871ddc87bb2ef7850ff859
*/
$(function(){
	var renderInterval = 40; // ms between frames
//	var timeline = [[[20,20,20]],[],[],[],[],[],[],[],[],[],[]];
	var timeline = [[[13,12,0],[12,11,0],[13,0,10],[14,12,0],[14,12,0],[13,12,0]],[[23,0,10]],[[15,0,0]],[],[],[],[],[[16,15,10]],[[21,20,13],[16,16,0]],[[21,16,20],[14,13,0],[15,0,0]],[[16,11,0],[15,12,0],[13,11,10]],[[13,0,0],[15,0,0]],[[15,13,0]],[[13,0,0],[13,0,0],[15,0,11],[13,0,0]],[[17,13,0],[24,22,0]],[],[[14,0,10],[15,13,0]],[[16,0,0],[14,0,0],[14,0,10],[15,0,0],[16,12,0],[16,11,0]],[[14,0,0]],[],[[13,0,0]],[[21,11,10],[13,12,0]],[],[[13,13,0]],[[15,0,0]],[[12,12,12],[13,0,10],[12,11,0],[13,0,0],[13,11,11]],[[12,0,0],[13,0,0],[13,0,0]],[[12,0,0],[12,0,0],[12,0,0],[13,0,0]],[[13,0,0],[13,11,0],[13,13,0],[13,11,0]],[[17,11,10],[14,13,0],[15,12,0],[14,13,0],[14,11,10]],[[15,12,0],[14,0,0],[13,13,0]],[[18,13,10],[14,0,11],[13,0,0]],[[13,0,0],[15,12,10]],[[15,12,10],[14,13,0],[15,0,11],[12,0,0],[13,0,0]],[[13,0,0],[13,13,0],[17,13,0],[14,11,10]],[[14,12,10],[13,11,11],[13,0,0],[11,0,0]],[[14,12,0]],[[14,12,12]],[[14,13,0],[19,11,11]],[[12,0,0]],[[14,11,0],[13,12,0],[15,13,0],[17,14,0],[21,13,0],[14,14,12],[14,13,0],[17,17,0]],[[13,11,0],[13,0,0]],[[14,0,11]],[[13,11,10],[13,13,10],[13,0,10]],[[14,11,0],[17,17,10]],[[12,0,0],[12,12,0]],[[15,13,11]],[[14,0,0],[12,0,0],[16,0,0]],[[13,0,0],[16,0,12],[16,11,10],[15,12,0],[17,0,0],[20,16,0]],[],[[17,15,0],[15,13,10]],[[16,11,10],[13,0,0],[13,0,0]],[],[[13,12,11],[17,11,13],[13,11,0]],[[13,12,10],[13,12,0]],[[14,12,0],[15,11,0],[15,0,10],[13,0,0]],[[21,13,0],[13,0,0]],[[14,0,10],[12,12,0]],[[14,12,0],[14,13,0]],[[15,0,0],[22,12,10]],[],[[17,14,11],[16,11,0]],[],[[15,0,0],[14,11,10]],[],[[15,12,0]],[[21,15,20],[15,11,0]],[[15,11,0],[13,0,10],[16,0,11]],[[14,12,0]],[[15,0,0]],[[15,0,0],[14,0,0]],[[26,16,20]],[[17,13,0]],[],[[14,12,0],[15,12,10],[14,11,0],[16,13,11],[21,13,12]],[[17,11,0]],[],[[24,13,10]],[],[[16,11,11],[17,0,0],[18,0,0],[15,0,0],[21,0,0],[18,0,0],[28,16,0],[22,11,0],[30,15,16],[34,0,0],[30,12,0]],[[36,11,0],[41,17,17],[31,12,0]],[[13,0,10]],[[23,14,11],[18,12,10]],[[19,11,0],[15,0,0]],[[18,11,10],[18,13,11],[34,21,10]],[[18,11,0]],[[14,0,0]],[[18,12,10],[15,13,0],[14,11,0]],[],[[14,0,10],[14,0,0]],[[16,11,10],[12,0,0]],[[15,0,0],[14,11,0]],[[15,11,10],[15,11,11],[15,12,10]],[[18,13,0]],[[14,11,0],[13,11,0],[12,11,10],[13,11,0],[18,11,10]],[[14,11,10],[14,12,0],[12,0,0]],[[15,0,0],[16,12,10],[20,12,11]],[[19,12,10],[14,0,0]],[[14,0,0]],[[14,11,0],[14,11,0],[19,0,0],[14,0,10],[14,11,0]],[],[[13,11,0],[13,0,11],[15,0,10],[15,0,0]],[[14,0,10],[15,11,10]],[],[[14,13,0]],[],[[14,0,10],[14,0,0],[14,11,10],[13,0,0],[14,11,0]],[[13,0,0],[13,0,0],[14,11,0],[15,13,0],[17,13,14]],[[13,11,0],[19,13,14],[13,0,0],[19,12,13],[13,0,0]],[[27,18,17],[13,0,0],[14,0,0],[15,0,0]],[[15,0,0]],[],[[18,13,0]],[],[[17,0,12]],[],[[15,11,10]],[[17,12,0],[14,11,10],[14,0,0],[13,0,0],[13,11,11],[16,12,10],[18,13,11],[15,0,10],[14,0,0],[16,0,0]],[[14,0,0]],[],[[14,0,0]],[[13,11,0],[13,11,10],[14,0,10],[19,11,10],[13,11,0]],[[19,11,13],[16,15,10],[15,13,0],[16,13,14]],[],[],[],[[13,11,0],[13,11,10],[14,11,0],[16,13,11]],[],[],[[18,12,11],[14,11,0],[13,0,0]],[[16,14,11],[15,0,10]],[[13,0,0],[16,14,12]],[[13,0,10],[13,0,10],[13,11,0],[15,12,11],[13,0,0],[17,13,11]],[[18,0,0]],[[14,12,10]],[[19,11,0]],[[13,11,10]],[[13,12,0],[13,0,11],[14,13,0],[18,14,13]],[[13,0,0],[13,0,0],[13,0,0],[16,0,0],[24,14,0]],[[22,13,10],[14,12,0],[15,13,0],[22,13,11]],[],[[15,11,0],[14,12,11],[14,13,0]],[[12,0,0],[13,11,10],[12,11,0],[13,0,0]],[],[[12,0,10],[13,0,0],[12,0,0],[12,0,0],[13,0,0],[14,12,0],[14,12,10]],[],[[13,0,0],[12,11,0],[13,0,0],[16,13,0]],[],[[14,0,0],[15,11,0]],[[14,11,10]],[],[[15,13,16],[14,11,12],[13,0,0],[15,0,0],[13,11,0],[14,0,0],[14,0,11],[14,11,12],[14,12,13],[14,0,0]],[[12,0,0],[17,14,13],[12,0,0],[12,11,0],[12,0,10]],[[14,11,0],[13,0,0],[11,0,11],[14,11,10]],[[100,39,72],[15,13,10]],[],[],[[12,0,0],[14,12,10]],[[16,11,13]],[[13,11,0],[21,16,11]],[],[[15,13,0],[13,0,10]],[],[[14,11,0],[16,12,15],[13,13,0],[13,11,0],[13,0,0]],[[12,11,0],[12,0,0],[12,0,0],[12,12,0],[12,0,0],[12,0,0],[14,12,10],[13,0,0],[13,0,10]],[[11,0,0],[12,11,0]],[[12,12,11],[14,13,0]],[[16,11,0]],[[13,11,0]],[],[[13,12,0]],[[14,12,0]],[[12,0,0],[13,0,10]],[[13,0,0],[16,0,10],[14,11,10]],[[12,0,10],[20,11,11]],[[12,0,0],[13,0,0],[16,11,10]],[],[],[],[],[[14,13,13]],[[14,0,0]],[[15,11,11]],[[13,11,0]],[[16,12,0],[13,11,0]],[[14,0,0],[13,0,0]],[[13,0,12],[19,13,0],[17,13,16],[13,0,10]],[],[],[[11,11,0],[13,0,10],[14,0,0],[12,0,0]],[[21,17,13],[13,0,0],[18,11,0]],[[15,0,0],[16,13,14],[14,0,0]],[[13,0,10],[15,13,15],[18,13,13]],[[17,11,12]],[[19,17,10],[13,11,0],[14,0,0]],[[13,11,15],[13,0,0],[14,12,10],[18,13,11],[13,0,0],[13,11,0]],[[14,11,10]],[],[[13,11,11],[13,0,11],[16,13,11]],[],[[13,0,10],[13,13,11],[13,0,10],[13,11,0],[13,0,0]],[[16,12,19]],[[21,12,0],[18,11,17]],[[13,0,10]],[[13,11,12],[12,0,10],[13,0,17],[13,13,0]],[[12,0,11],[13,0,0],[13,11,11]],[],[[13,11,10]],[[13,12,0],[14,11,11]],[[14,0,10]],[[14,11,11]],[],[[14,0,10]],[],[[16,13,17],[13,0,10]],[[14,0,11]],[[15,0,19],[15,12,0],[15,15,0]],[[14,0,0],[14,0,0],[14,12,11]],[],[[12,0,11],[17,11,11]],[[14,0,0]],[[12,12,16]],[],[],[],[[14,11,10]],[],[],[[12,0,10],[13,0,11],[13,12,13]],[[18,12,0],[16,11,10]],[[14,11,11]],[],[],[],[],[[14,11,10]],[],[],[],[[13,0,11]],[[13,0,12],[13,0,11],[14,0,0]],[[12,11,14],[13,13,14],[12,0,10],[12,0,0]],[[12,0,0],[13,0,10],[11,0,0],[13,0,10],[12,0,0],[13,0,0],[12,0,0],[12,0,10]],[[13,0,12],[17,13,21],[14,11,10]],[[13,0,12]],[[13,12,14],[15,13,0]],[[13,0,10],[15,14,0],[12,0,10],[12,11,0],[12,11,0]],[[16,13,15],[13,0,10]],[[14,13,0],[13,12,0]],[[19,14,13]],[],[[12,0,10],[13,11,0],[12,0,0]],[[12,11,10],[10,0,0]],[[16,15,13]],[[14,12,13]],[[34,19,16]],[[11,0,0]],[[12,0,10],[12,11,10],[12,0,0],[13,0,10]],[[14,12,10]],[],[],[[12,0,10],[13,0,0],[12,0,0],[12,0,0]],[[14,0,11],[13,0,0],[13,11,11]],[[13,13,11],[13,11,16]],[[14,0,0]],[[13,11,11],[12,11,0],[13,13,11],[13,0,14],[17,13,10],[16,0,0]],[[14,0,15]],[[12,11,11]],[[15,14,15]],[],[[13,0,12],[15,0,0],[14,0,0],[14,12,0]],[],[[12,11,0],[13,12,13]],[[28,0,0],[21,0,0],[12,0,0],[13,12,10]],[],[],[[11,11,10],[16,13,15],[18,11,12]],[],[],[[12,0,0],[18,0,11]],[[14,12,0]],[[13,12,10]],[[14,11,11]],[[13,0,11],[14,0,10],[14,0,10]],[[13,0,10]],[[12,0,10],[14,0,10]],[],[[15,15,17]],[[13,11,0]],[[14,11,10],[13,11,0],[12,0,0],[17,12,14]],[[16,11,17],[12,0,0],[13,0,10]],[[17,0,12]],[[12,11,10]],[[20,19,28],[13,12,11]],[],[[13,11,13]],[[13,11,10],[13,0,0]],[],[],[[13,14,10]],[[13,0,10],[15,0,12]],[[20,13,12],[14,0,10]],[[14,11,0],[14,13,11]],[],[],[],[],[[12,0,11]],[],[],[],[[12,0,0]],[],[[17,13,10]],[[12,0,0],[11,0,0],[13,11,12]],[],[[12,12,0]],[],[],[],[]];

	var imgs = {};
	var sprites = ["electric", "spark", "star"];
	var loading = sprites.length;
	sprites.map(function(name) {
		var img = new Image();
		img.src = "img/" + name + ".png";
		img.onload = function() { --loading; };
		imgs[name] = img;
	});
	function goCanvas(){
		var drag = 0.99;
		var gravity = 0.5;
		var wind = -0.2;

		var particles = [];
		var spareParticles = [];
		var clock = 0;
		var day = 0;

		function Vector3(x, y, z) {
			this.x = x;
			this.y = y;
			this.z = z;
			this.tx = 0;
			this.tz = 0;
			this.cosRY = 0;
			this.sinRY = 0;
			this.fall = 0;
			this.rotateX = function(angle) {
				this.tz = this.z;
				this.ty = this.y;
				cosRX = Math.cos(angle);
				sinRX = Math.sin(angle);
				this.z = (this.tz * cosRX) + (this.ty * sinRX);
				this.y = (this.tz * -sinRX) + (this.ty * cosRX);
				return this;
			}
			this.rotateY = function(angle) {
				this.tx = this.x;
				this.tz = this.z;
				cosRY = Math.cos(angle);
				sinRY = Math.sin(angle);
				this.x = (this.tx * cosRY) + (this.tz * sinRY);
				this.z = (this.tx * -sinRY) + (this.tz * cosRY);
				return this;
			}
			this.rotateZ = function(angle) {
				this.ty = this.y;
				this.tx = this.x;
				cosRZ = Math.cos(angle);
				sinRZ = Math.sin(angle);
				this.y = (this.ty * cosRZ) + (this.tx * sinRZ);
				this.x = (this.ty * -sinRZ) + (this.tx * cosRZ);
				return this;
			}
			this.rotate = function(ax, ay, az) {
				this.rotateX(ax).rotateY(ay).rotateZ(az);
				return this;
			}
			this.reset = function(x, y, z) {
				this.x = x;
				this.y = y;
				this.z = z;
				this.fall = 0;
			}
			this.plusEq = function(v) {
				this.x += v.x;
				this.y += v.y;
				this.z += v.z;
				return this;
			}
			this.multiplyEq = function(s) {
				this.x *= s;
				this.y *= s;
				this.z *= s;
				this.fall *= s;
				return this;
			}
			this.invert = function() {
				return new Vector3(0-this.x, 0-this.y, 0-this.z);
			}
			this.copy = function() {
				return new Vector3(0+this.x, 0+this.y, 0+this.z);
			}
			this.magnitude = function() {
				return Math.sqrt( Math.pow(this.x, 2) + Math.pow(this.y - this.fall, 2) + Math.pow(this.z, 2) );
			}
		}

		function Particle(opts) {
			this.reset = function(opts) {
				this.img = imgs.star;
				this.grav = 1;
				this.drag = 1;
				this.enabled = true;
				this.grav = 1;
				this.data = null;
				this.scale = 1;
				this.cont = function(particle) {
					return true;
				}
				for ( var k in opts ) this[k] = opts[k];
			}
			this.reset(opts);
			this.update = function() {
				if (this.enabled) {
					if ( this.cont(this) ) {
						this.pos.plusEq(this.vel);
						this.vel.multiplyEq(drag * this.drag);
						var fall = gravity * this.grav;
						this.vel.fall += fall;
						this.vel.y += fall;
						this.pos.x += wind;
					} else {
						this.enabled = false;
						spareParticles.push(this);
					}
				}
			}
		}

		function launchRocket(data) {
			getParticle({
				pos: new Vector3((Math.random() * 100) - 50, 190, 0),
				vel: new Vector3((Math.random() * 10) - 5, (Math.random() * 3) - 18, (Math.random() * 6) - 3),
				img: imgs.electric,
				data: data,
				cont: function(rocket) {
					// Continue while rising
					if ( rocket.vel.y < 0 )
						return true;
					// Spawn explosion particles
					explode1(rocket, 1);
					explode2(rocket, 2);
					explode3(rocket, 0);
					// Become bright, expand, contract, fade away
					rocket.img = imgs.spark;
					rocket.vel = new Vector3(0, 0, 0);
					rocket.grav = 0.1;
					rocket.drag = 0.8;
					// Central explosion
					var x = Math.sqrt(rocket.data[0]) / 10;
					rocket.scales = [1,2,3,4,5,5,4,4,3,3,2,2,0] . map(function(s){return s*x;});
					rocket.cont = function() { return rocket.scale = rocket.scales.shift(); };
					return true;
				}
			});
		}

		// Spherical outer shell
		function explode1(rocket, el) {
			if ( rocket.data[el] == 0 )
				return;
			var root = Math.sqrt(rocket.data[el]);
			var vel = new Vector3(root, root, root);
			var cont = function(p) {
				return ( p.vel.magnitude() > 1 || Math.round( Math.random() * 10 ) % 3 );
			}
			for ( var i = 0; i < rocket.data[el]; ++i ) {
				vel.rotate(Math.random(), Math.random(), Math.random());
				var myVel = vel.copy().multiplyEq( (Math.random() + 19) / 20);
				getParticle({
					pos: rocket.pos.copy(),
					vel: myVel,
					grav: 0.2,
					drag: 0.9,
					cont: cont,
				});
				getParticle({
					pos: rocket.pos.copy(),
					vel: myVel.invert(),
					grav: 0.2,
					drag: 0.9,
					cont: cont,
				});
			}
		}

		// Ring
		function explode2(rocket, el) {
			if ( rocket.data[el] == 0 )
				return;
			var root = Math.sqrt(rocket.data[el]);
			var vel = new Vector3(root, 0, root);
			var cont = function(p) {
				return ( p.vel.magnitude() > 1 );
			}
			var rX = 1 - 2 * Math.random();
			var rZ = 1 - 2 * Math.random();
			for ( var i = 0; i < rocket.data[el]; ++i ) {
				vel.rotateY(Math.random());
				var myVel = vel.copy().rotateX(rX).rotateZ(rZ).multiplyEq( 1.5 + Math.random() / 5 );
				getParticle({
					pos: rocket.pos.copy(),
					vel: myVel,
					grav: 0.2,
					drag: 0.9,
					cont: cont,
					img: imgs.electric,
					scale: 0.7,
				});
				getParticle({
					pos: rocket.pos.copy(),
					vel: myVel.invert(),
					grav: 0.2,
					drag: 0.9,
					cont: cont,
					img: imgs.electric,
					scale: 0.7,
				});
			}
		}

		// Inner sphere
		function explode3(rocket, el) {
			if ( rocket.data[el] == 0 )
				return;
			var root = Math.sqrt(rocket.data[el]) / 3;
			var vel = new Vector3(root, root, root);
			var cont = function(p) {
				return ( p.vel.magnitude() > .3 );
			}
			for ( var i = 0; i < rocket.data[el]; ++i ) {
				vel.rotate(Math.random(), Math.random(), Math.random());
				var myVel = vel.copy().multiplyEq( Math.random() / 2 + .25);
				getParticle({
					pos: rocket.pos.copy(),
					vel: myVel,
					grav: 0.2,
					drag: 0.93,
					cont: cont,
					img: imgs.spark,
					scale: 0.6,
				});
				getParticle({
					pos: rocket.pos.copy(),
					vel: myVel.invert(),
					grav: 0.2,
					drag: 0.93,
					cont: cont,
					img: imgs.spark,
					scale: 0.6,
				});
			}
		}

		function getParticle(opts) {
			var particle;
			o=opts;
			if (spareParticles.length == 0) {
				particle = new Particle(opts);
				particles.push(particle);
			} else {
				particle = spareParticles.shift();
				particle.reset(opts);
			}
			p=particle;
			return particle;
		}

		function setup() {
			var canvas = document.getElementById('fireworks');
			var c = canvas.getContext('2d');
			var fov = 300;
			var SCREEN_WIDTH = 600;
			var SCREEN_HEIGHT = 400;
			var HALF_WIDTH = SCREEN_WIDTH / 2;
			var HALF_HEIGHT = SCREEN_HEIGHT / 2;

			function draw3Din2D(particle) {
				x3d = particle.pos.x;
				y3d = particle.pos.y;
				z3d = particle.pos.z;
				var scale = fov / (fov + z3d);
				var x2d = (x3d * scale) + HALF_WIDTH;
				var y2d = (y3d * scale) + HALF_HEIGHT;
				scale *= 6 * particle.scale;
				if (scale > 0) {
					c.drawImage(particle.img, x2d - scale, y2d - scale, scale * 2, scale * 2);
				}
			}

			function render() {
				if ( loading )
					return;
				var particle;
				if ( clock % 10 == 0 ) {
					timeline[day].map(launchRocket);
					day = ++day % timeline.length;
				}
				++clock;

				// Fade the previous frame
				c.fillStyle = "rgba(0,0,0,0.3)";
				c.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

				// Draw from farthest to nearest
				particles.sort(compareZPos);

				for (i = 0; i < particles.length; i++) {
					particle = particles[i];
					particle.update();
					if ( particle.enabled )
						draw3Din2D(particle);
				}
			}

			function compareZPos(a, b) {
				return (b.pos.z - a.pos.z)
			}

			var loop = setInterval(function() {
				render();
			}, renderInterval);
		}
		
		setup();
		
	}
	
	goCanvas();
});