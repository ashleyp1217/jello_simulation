/*
 * Cloth Simulation using a relaxed constraints solver
 */

// Suggested Readings

// Advanced Character Physics by Thomas Jakobsen Character
// http://freespace.virgin.net/hugo.elias/models/m_cloth.htm
// http://en.wikipedia.org/wiki/Cloth_modeling
// http://cg.alexandra.dk/tag/spring-mass-system/
// Real-time Cloth Animation http://www.darwin3d.com/gamedev/articles/col0599.pdf

var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
var MASS = 0.1;
var restDistance = 25;

var xSegs = 3;
var ySegs = 3;
var zSegs = 3;

var clothFunction = cube(restDistance * xSegs, restDistance * ySegs, restDistance * zSegs);

var cloth = new Cloth( xSegs, ySegs, zSegs);

var GRAVITY = 981 * 1.4;
var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );


var TIMESTEP = 10 / 1000;
// var TIMESTEP = 1;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

var pins = [];


var wind = true;
var windStrength = 2;
var windForce = new THREE.Vector3( 0, 0, 0 );

var tmpForce = new THREE.Vector3();

var lastTime;


function cube( width, height, depth) {

	return function (t, u, v, target ) {

		var x = (t - 0.5) * width;
		var y = ( u + 0.5 ) * height;
		var z = ( v - 0.5) * depth;

		target.set( x, y, z );

	};

}

function Particle( x, y, z, mass ) {

	this.position = new THREE.Vector3();
	this.previous = new THREE.Vector3();
	this.original = new THREE.Vector3();
	this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
	this.mass = mass;
	this.invMass = 1 / mass;
	this.tmp = new THREE.Vector3();
	this.tmp2 = new THREE.Vector3();

	// init

	clothFunction( x, y, z, this.position ); // position
	clothFunction( x, y, z, this.previous ); // previous
	clothFunction( x, y, z, this.original );

}

// Force -> Acceleration

Particle.prototype.addForce = function ( force ) {

	this.a.add(
		this.tmp2.copy( force ).multiplyScalar( this.invMass )
	);

};


// Performs Verlet integration

Particle.prototype.integrate = function ( timesq ) {

	var newPos = this.tmp.subVectors( this.position, this.previous );
	newPos.multiplyScalar( DRAG ).add( this.position );
	newPos.add( this.a.multiplyScalar( timesq ) );

	this.tmp = this.previous;
	this.previous = this.position;
	this.position = newPos;

	this.a.set( 0, 0, 0 );

};


var diff = new THREE.Vector3();

function satisfyConstraints( p1, p2, distance ) {

	diff.subVectors( p2.position, p1.position );
	var currentDist = diff.length();
	if ( currentDist === 0 ) return; // prevents division by 0
	var correction = diff.multiplyScalar( 1 - distance / currentDist );
	var correctionHalf = correction.multiplyScalar( 0.5 );
	p1.position.add( correctionHalf );
	p2.position.sub( correctionHalf );

}


function Cloth( w, h, d) {

	w = w || 10;
	h = h || 10;
	d = d || 10;

	this.w = w;
	this.h = h;
	this.d = d;

	var particles = [];
	var constraints = [];

	var x, y, z;

	// Create particles

	var count = 0;
	for ( z = 0; z < d; z ++ ) {
		for ( y = 0; y < h;  y++ ) {
			for (x = 0; x < w; x ++) {
				// console.log("Count: " + count, "Index: " + index(x, y, z), x, y, z);
				console.log(particles)
				console.log(x / w);

				particles.push(
					new Particle( x / w, y / h, z / d, MASS )
				);
				count ++;
			}
		}
	}
	
	// Structural

	for ( z = 0; z < d; z ++ ) {
		for ( y = 0; y < h;  y++ ) {
			for (x = 0; x < w; x ++) {
				if (x < w - 1) {
					console.log(x, y, z);
					console.log(index(x, y, z));
					constraints.push( [
						particles[index(x, y, z)],
						particles[index(x + 1, y, z)]
					]);
				}
				if (y < h - 1) {
					constraints.push([
						particles[ index(x, y, z)],
						particles[index(x, y + 1, z)]
					]);
				}
				if (z < d - 1) {
					constraints.push([
						particles[index(x, y, z)],
						particles[index(x, y, z + 1)]
					])
				}
			}
		}
	}


	// While many systems use shear and bend springs,
	// the relaxed constraints model seems to be just fine
	// using structural springs.
	// Shear
	// var diagonalDist = Math.sqrt(restDistance * restDistance * 2);


	// for (v=0;v<h;v++) {
	// 	for (u=0;u<w;u++) {

	// 		constraints.push([
	// 			particles[index(u, v)],
	// 			particles[index(u+1, v+1)],
	// 			diagonalDist
	// 		]);

	// 		constraints.push([
	// 			particles[index(u+1, v)],
	// 			particles[index(u, v+1)],
	// 			diagonalDist
	// 		]);

	// 	}
	// }


	this.particles = particles;
	this.constraints = constraints;

	function index( x, y, z) {
		return x + (y + d * z) * w;

	}

	this.index = index;

}

function simulate( time ) {

	if ( ! lastTime ) {

		lastTime = time;
		return;

	}

	var i, il, particles, particle, pt, constraints, constraint;

	for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

		particle = particles[ i ];
		particle.addForce( gravity );

		particle.integrate( TIMESTEP_SQ );

	}


	// Start Constraints

	// console.log(cloth.constraints);
	// constraints = cloth.constraints;
	// il = constraints.length;

	// for ( i = 0; i < il; i ++ ) {

	// 	constraint = constraints[ i ];
	// 	satisfyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

	// }

	// // Floor Constraints

	for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

		particle = particles[ i ];
		pos = particle.position;
		if ( pos.y < - 20 ) {

			pos.y = -19;

		}

	}

	// // Pin Constraints

	// for ( i = 0, il = pins.length; i < il; i ++ ) {

	// 	var xy = pins[ i ];
	// 	var p = particles[ xy ];
	// 	p.position.copy( p.original );
	// 	p.previous.copy( p.original );

	// }


}