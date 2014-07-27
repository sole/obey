(function() {
	var initialised = false,
		world,
		fps = 60,
		timeStep = 1 / fps,
		txt,
		canvas,
		canvasContext,
		canvasWidth = window.innerWidth,
		canvasHeight = window.innerHeight,
		imgPendulum,
		frameWidth = canvasWidth,
		frameHeight = canvasHeight / 20,
		pendulumRadius = 30,
		debugDraw,
		drawScale = 1,
		frameTopBody,
		pendulum,
		updating = false,
		simulationInterval,
		audioContext,
		oscillator,
		panNode,
		gainNode,
		oscParams = { baseFreq: 50, multX: 200, multY: 500 },
		mouseX = 0,
		mouseY = 0,
		isMouseDown = false,
		mousePositionVec,
		selectedBody,
		mouseJoint = false, 
		canvasPosition,
		t0 = 0;

	function init() {
	
		if( !AudioDetector.detects( ['webAudioSupport'] ) ) {
			console.log('bo');
			return;
		}
		
		world = new B2D.World( {x: 0, y: 60 } );
		debugDraw = new B2D.DebugDraw();

		var wrapper = document.getElementById('wrapper');
		txt = document.getElementById('txt');
		
		canvas = document.createElement( 'canvas' );
		canvasContext = canvas.getContext( '2d' );
		wrapper.appendChild( canvas );
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		canvasContext.fillStyle = 'rgb(0, 0, 0, 0.005)';
		canvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
		canvas.style.background = '#000';

		canvasPosition = getElementPosition( canvas );

		imgPendulum = new Image();
		imgPendulum.src = 'data/i.png';

		debugDraw.canvas = canvas;
		debugDraw.drawScale = drawScale;
		debugDraw.fillAlpha = 0.5;
		debugDraw.lineThickness = 1.0;
		
		debugDraw.flags = B2D.DebugDraw.SHAPE | B2D.DebugDraw.JOINT;
		
		world.setDebugDraw( debugDraw );

		createFrame();
		createPendulum();

		setupMouseEvents();

		setupSound();
		
		initialised = true;

		resumeSimulation();

	}

	function createFrame() {

		frameTopBody = B2D.Shortcuts.createBody({
			x: canvasWidth / 2,
			y: frameHeight / 2,
			width: frameWidth,
			height: frameHeight,
			type: B2D.BodyDef.STATIC,
			world: world
		});
	
	}

	function createPendulum() {
		pendulum = B2D.Shortcuts.createBody({
			world: world,
			x: canvasWidth / 2,
			y: canvasHeight / 2,
			shape: B2D.CircleShape,
			radius: pendulumRadius,
			density: 1
		});

		var hookPoint = { x: canvasWidth / 2, y: frameHeight / 2 };

		var joint = B2D.Shortcuts.createJoint({
			world: world,
			body1: frameTopBody,
			body2: pendulum,
			anchor1: hookPoint,
			anchor2: pendulum.getWorldCenter(),
			klass: B2D.DistanceJointDef
		});

		joint._joint.SetDampingRatio( 0 );
		joint._joint.SetFrequency( 1 / timeStep );

		var r = Math.min(canvasWidth / 2, (canvasHeight / 2) - (frameHeight / 2)),
			ang =  0.05 * Math.PI,
			x0 = canvasWidth / 2,
			y0 = frameHeight / 2,
			arcX = r * Math.cos( ang ),
			arcY = r * Math.sin( ang );
		
		pendulum._body.SetPosition({ x: x0 + arcX, y: y0 + arcY});

		pendulum._body.ApplyForce({ x: 0, y: 100000000}, pendulum._body.GetWorldCenter() );
	}

	function setupMouseEvents() {
		document.addEventListener('mousedown', function(e) {
			isMouseDown = true;
			txt.style.opacity = 1;
			handleMouseMove(e);
			document.addEventListener('mousemove', handleMouseMove, true);
		}, true);
		
		document.addEventListener('mouseup', function() {
			document.removeEventListener('mousemove', handleMouseMove, true);
			isMouseDown = false;
		}, true);
		
	}

	function handleMouseMove(e) {
		mouseX = (e.clientX - canvasPosition.x) / drawScale;
		mouseY = (e.clientY - canvasPosition.y) / drawScale;
	}
	
	function getBodyCallback(fixture) {
		if(fixture.GetBody().GetType() != Box2D.Dynamics.b2Body.b2_staticBody) {
			if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePositionVec)) {
				selectedBody = fixture.GetBody();
				return false;
			}
		}
		return true;
	}
	
	function getBodyAtMouse() {
		mousePositionVec = new Box2D.Common.Math.b2Vec2(mouseX, mouseY);
		var aabb = new Box2D.Collision.b2AABB();
		aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001);
		aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001);
		
		selectedBody = null;
		world._world.QueryAABB(getBodyCallback, aabb);
		return selectedBody;
	}

	function getElementPosition(el) {
		var left = el.offsetLeft;
		var top = el.offsetTop;
		var e = el.offsetParent;

		do {
		   left += e.offsetLeft;
			top += e.offsetTop;

		} while (e = e.offsetParent);

		return {x: left, y: top};
	}


	function setupSound() {
		audioContext = new AudioContext();

		var almostNow = audioContext.currentTime + 0.0020;

		oscillator = audioContext.createOscillator();
		panNode = audioContext.createPanner();
		gainNode = audioContext.createGainNode();

		oscillator.connect( panNode );

		panNode.connect( gainNode );
		panNode.panningModel = 1;
		
		gainNode.connect( audioContext.destination );
		gainNode.gain.value = 0.5;
		

		audioContext.listener.setPosition( 0, 0, 0 );

		updateAudio();

		oscillator.noteOn( almostNow );

	}

	function updateAudio() {
		var body = pendulum._body,
			position = body.GetWorldCenter(),
			transformation = body.GetTransform(),
			x = position.x,
			y = position.y,
			velocity = body.GetLinearVelocity(),
			mult = 250;

		panNode.setPosition( -mult * (0.5 - x / canvasWidth), 0, 5);
		panNode.setVelocity( -mult * velocity.x, mult * velocity.y, 0);

		oscillator.frequency.value = oscParams.baseFreq + oscParams.multY * ((canvasHeight - y) / canvasHeight);
	}

	function resumeSimulation() {
		if( !initialised ) {
			return;
		}
		
		if( updating ) {
			return;
		}
		simulationInterval = setInterval( updateSimulation, 1000 / fps );

		t0 = Date.now();
		
		animate();
		updating = true;
	}

	function stopSimulation() {
		clearInterval( simulationInterval );
		updating = false;
	}

	function updateSimulation() {

		if(isMouseDown && (!mouseJoint)) {
			var body = getBodyAtMouse();
			if(body) {
				var mouseJointDef = new Box2D.Dynamics.Joints.b2MouseJointDef();
				mouseJointDef.bodyA = world._world.GetGroundBody();
				mouseJointDef.bodyB = body;
				mouseJointDef.target.Set(mouseX, mouseY);
				mouseJointDef.maxForce = 60000.0 * body.GetMass();
				mouseJoint = world._world.CreateJoint(mouseJointDef);
				body.SetAwake(true);
			}
		}
		
		if(mouseJoint) {
			if(isMouseDown) {
				mouseJoint.SetTarget(new Box2D.Common.Math.b2Vec2(mouseX, mouseY));
			} else {
				world._world.DestroyJoint(mouseJoint);
				mouseJoint = null;
			}
		}

		var pbody = pendulum._body,
			ppos = pbody.GetPosition(),
			nx = 0.5 - ppos.x / canvasWidth,
			pvel = pbody.GetLinearVelocity(),
			xsign = pvel.x > 0 ? 1 : -1;

		if( Math.abs( nx ) <= 0.05 && xsign < 0 ) {
			pbody.ApplyForce({ x: pbody.GetMass() * 1000000000 * xsign, y: -10000000000 }, ppos);
		}

		world.step(timeStep, 10, 10);
		world.clearForces();

		updateAudio();
		
	}

	function animate() {
		requestAnimationFrame( animate );

		var elapsed = t0 - Date.now();

		var pad = 4;
		canvasContext.save();

		canvasContext.translate( canvasWidth / 2, canvasHeight / 2);
		canvasContext.rotate( -0.015 );
	
		canvasContext.globalAlpha = 0.5;
		canvasContext.drawImage( canvas, -pad - canvasWidth/2, -pad - canvasHeight/2, canvasWidth + pad*2, canvasHeight + pad*2);

		canvasContext.restore();
		
		var ppos = pendulum._body.GetWorldCenter();

		canvasContext.save();

		canvasContext.translate( ppos.x, ppos.y );
		canvasContext.rotate( elapsed * 0.0015 );

		canvasContext.globalAlpha = 1;

		canvasContext.drawImage( imgPendulum, -pendulumRadius, -pendulumRadius, pendulumRadius * 2, pendulumRadius * 2 );


		canvasContext.restore();
	}

	PageVisibility.onVisibilityChangeCallback = function( isVisible ) {
		if( isVisible ) {
			resumeSimulation();
		} else {
			stopSimulation();
		}
	};

	document.onreadystatechange = function() {
		if(document.readyState == 'complete') {
			init();
		}
	};
})();
