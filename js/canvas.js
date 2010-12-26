/*======================================================
Heavily inspired by Seb Lee-Delisle' talk @fullfrontal 2010
Ref - http://bit.ly/fgUay5
========================================================*/

$(function(){
	
	function goCanvas(){
	
		var chosen_image = $("#image_src :selected").val() + ".png";
		var chosen_gravity = $("#gravity :selected").val();
	
		switch(chosen_gravity) {
		
			case "0":
				var drag = 1; 
				var gravity = 0.01;
			break;
		
			case "1":
				var drag = .99;
				var gravity =.5;
			break;
		
			case "2":
				var drag = .99;
				var gravity = 1;
			break;
		
			case "3":
				var drag = .99;
				var gravity = 1.5;
			break;
	
		}
	
		var lastMouseX = 0;

		function Vector3(x, y, z) {

		    this.x = x;
		    this.y = y;
		    this.z = z;

		    this.tx = 0;
		    this.tz = 0;
		    this.cosRY = 0;
		    this.sinRY = 0;

		    this.rotateY = function(angle) {
		        this.tx = this.x;
		        this.tz = this.z;

		        cosRY = Math.cos(angle);
		        sinRY = Math.sin(angle);

		        this.x = (this.tx * cosRY) + (this.tz * sinRY);
		        this.z = (this.tx * -sinRY) + (this.tz * cosRY);

		    }

		    this.reset = function(x, y, z) {
		        this.x = x;
		        this.y = y;
		        this.z = z;
		    }

		    this.plusEq = function(v) {
		        this.x += v.x;
		        this.y += v.y;
		        this.z += v.z;
		    }

		    this.multiplyEq = function(s) {
		        this.x *= s;
		        this.y *= s;
		        this.z *= s;

		    }

		}

		function Particle() {

		    this.pos = new Vector3(0, 0, 0);
		    this.vel = new Vector3(0, 0, 0);
		    this.enabled = true;

		    this.reset = function() {
		        this.pos.reset(0, -100, 0);
		        this.vel.reset((Math.random() * 20) - 10, Math.random() * -5, (Math.random() * 20) - 10);
		        this.enabled = true;
		    }

		    this.reset();
		    this.update = function() {
		        if (this.enabled) {
		            this.pos.plusEq(this.vel);
		            this.vel.multiplyEq(drag);

		            this.vel.y += gravity;
		        }
		    }


		}

		function setup() {

		    var fov = 250;

		    var SCREEN_WIDTH = 600;
		    var SCREEN_HEIGHT = 400;

		    var HALF_WIDTH = SCREEN_WIDTH / 2;
		    var HALF_HEIGHT = SCREEN_HEIGHT / 2;

		    var numPoints = 100;

		    var mouseX = 0;
		    var mouseY = -200;

		    var isMouseDown = false;

		    var img = new Image();
		    img.src = chosen_image;
	
		    function draw3Din2D(particle) {
		        x3d = particle.pos.x;
		        y3d = particle.pos.y;
		        z3d = particle.pos.z;
		        var scale = fov / (fov + z3d);
		        var x2d = (x3d * scale) + HALF_WIDTH;
		        var y2d = (y3d * scale) + HALF_HEIGHT;

		        scale *= 6;
		        if (scale > 0) {
		            c.drawImage(img, x2d - scale, y2d - scale, scale * 2, scale * 2);
		        }

		    }

		    var canvas = document.getElementById('fireworks');
		    var c = canvas.getContext('2d');
		    canvas.onmousedown = function(a) {
		        isMouseDown = true;
		        lastMouseX = mouseX;
		    }

		    document.onmouseup = function(a) {
		        isMouseDown = false;
		    }

		    document.onmousemove = updateMouse;

		    var particles = [];
		    var spareParticles = [];

		    function render() {
		        var particle;

		        if (!isMouseDown) {
		            for (var i = 0; i < 4; i++) {
		                if (spareParticles.length == 0) {
		                    particle = new Particle();
		                    particles.push(particle);
		               } else {
		                    particle = spareParticles.shift();
		                    particle.reset();
		                }

		            }
		        }

		        c.fillStyle = "rgba(0,0,0,0.3)";
		        c.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

		        particles.sort(compareZPos);

		        for (i = 0; i < particles.length; i++) {
		            particle = particles[i];

		            if (!isMouseDown) {
		                particle.update();
		                if (particle.enabled && (particle.pos.y > 250)) {
		                    particle.enabled = false;
		                    spareParticles.push(particle);
		                }
		            } else {
		                particle.pos.rotateY((lastMouseX - mouseX) * 0.01);
		                particle.vel.rotateY((lastMouseX - mouseX) * 0.01);

		            }


		            if (particle.enabled) draw3Din2D(particle);

		        }
		        lastMouseX = mouseX;
		    }

		    function compareZPos(a, b) {
		        return (b.pos.z - a.pos.z)
		    }

		    function updateMouse(e) { 
		        mouseX = e.pageX - canvas.offsetLeft - HALF_WIDTH;
		        mouseY = e.pageY - canvas.offsetTop - HALF_HEIGHT;;
		    }

		    var loop = setInterval(function() {
		        render();
		    }, 50);

		}
		
		setup();
		
	}
	
		goCanvas();
		
		$("select").change( function(){
			$("canvas").remove();
			$("form").after('<canvas id="fireworks" width="600" height="400"></canvas>');
			goCanvas();
		});
	
});