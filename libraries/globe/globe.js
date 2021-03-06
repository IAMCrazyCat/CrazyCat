/**
 * dat.globe Javascript WebGL Globe Toolkit
 * https://github.com/dataarts/webgl-globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Modified by Ziming 2020
 */





var DAT = DAT || {};

DAT.Globe = function (container, opts) {
  opts = opts || {};

  var colorFn = opts.colorFn || function (x) {
    var c = new THREE.Color();
    c.setHSL((0.6 - (x * 0.5)), 1.0, 0.5);
    return c;
  };
  var imgDir = opts.imgDir || 'materials/';

  var Shaders = {
    'earth': {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        'vNormal = normalize( normalMatrix * normal );',
        'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
        'vec3 diffuse = texture2D( texture, vUv ).xyz;',
        'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
        'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
        'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere': {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'vNormal = normalize( normalMatrix * normal );',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
        'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  var camera, scene, renderer, w, h;
  var mesh, atmosphere, point;

  var overRenderer;

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
    target = { x: Math.PI * 1.014, y: Math.PI / 6.0 * 0.077 }, // Earth rotation target
    firstRotationTarget = { x: Math.PI * 3, y: Math.PI * 3 },
    targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;
  var rotationSpeed = 0.5;
  var zoomSpeed = 5;
  var spin = false;

  //var light = new THREE.PointLight( 0xff0000, 1, 100 ); // soft white light 
  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);

    //camera.position.z = distance + 10000;

    scene = new THREE.Scene();
    scene.background = new THREE.CubeTextureLoader()
      .setPath('./bg/space2/')
      .load([
        'px.jpg',
        'nx.jpg',
        'py.jpg',
        'ny.jpg',
        'pz.jpg',
        'nz.jpg'
      ]);


    var geometry = new THREE.SphereGeometry(200, 40, 30);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].value = new THREE.TextureLoader().load(imgDir + 'world.jpg');
    //uniforms['texture'].value = THREE.ImageUtils.loadTexture('https://raw.githubusercontent.com/IAMCrazyCat/CrazyCat/master/materials/world.jpg');
 
    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;

    scene.add(mesh);


    //scene.add(light);

    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1.1, 1.1, 1.1);
    scene.add(mesh);

    geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

    point = new THREE.Mesh(geometry);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);

    renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);

    container.addEventListener('mousedown', onMouseDown, false);

    container.addEventListener('mousewheel', onMouseWheel, false);

    document.addEventListener('keydown', onDocumentKeyDown, false);

    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function () {
      overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function () {
      overRenderer = false;
    }, false);
  }

  function addData(data, opts) {
    var lat, lng, size, color, i, step, colorFnWrapper;

    opts.animated = opts.animated || false;
    this.is_animated = opts.animated;
    opts.format = opts.format || 'magnitude'; // other option is 'legend'
    if (opts.format === 'magnitude') {
      step = 3;
      colorFnWrapper = function (data, i) { return colorFn(data[i + 2]); }
    } else if (opts.format === 'legend') {
      step = 4;
      colorFnWrapper = function (data, i) { return colorFn(data[i + 3]); }
    } else {
      throw ('error: format not supported: ' + opts.format);
    }

    if (opts.animated) {
      if (this._baseGeometry === undefined) {
        this._baseGeometry = new THREE.Geometry();
        for (i = 0; i < data.length; i += step) {
          lat = data[i];
          lng = data[i + 1];
          //        size = data[i + 2];
          color = colorFnWrapper(data, i);
          size = 0;
          addPoint(lat, lng, size, color, this._baseGeometry);
        }
      }
      if (this._morphTargetId === undefined) {
        this._morphTargetId = 0;
      } else {
        this._morphTargetId += 1;
      }
      opts.name = opts.name || 'morphTarget' + this._morphTargetId;
    }
    var subgeo = new THREE.Geometry(); // New Sub-geomery spot
    for (i = 0; i < data.length; i += step) {
      lat = data[i];
      lng = data[i + 1];
      color = colorFnWrapper(data, i);
      size = data[i + 2];
      size = size * 200;
      addPoint(lat, lng, size, color, subgeo);
    }
    if (opts.animated) {
      this._baseGeometry.morphTargets.push({ 'name': opts.name, vertices: subgeo.vertices });
    } else {
      this._baseGeometry = subgeo;
    }

  };


  function createPoints() {
    if (this._baseGeometry !== undefined) {
      if (this.is_animated === false) {
        this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: THREE.FaceColors,
          morphTargets: false
        }));
      } else {
        if (this._baseGeometry.morphTargets.length < 8) {
          console.log('t l', this._baseGeometry.morphTargets.length);
          var padding = 8 - this._baseGeometry.morphTargets.length;
          console.log('padding', padding);
          for (var i = 0; i <= padding; i++) {
            console.log('padding', i);
            this._baseGeometry.morphTargets.push({ 'name': 'morphPadding' + i, vertices: this._baseGeometry.vertices });
          }
        }
        this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: THREE.FaceColors,
          morphTargets: true
        }));
      }
      scene.add(this.points);
    }
  }

  function addPoint(lat, lng, size, color, subgeo) {

    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    point.position.y = 200 * Math.cos(phi);
    point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    point.lookAt(mesh.position);

    point.scale.z = Math.max(size, 0.1); // avoid non-invertible matrix
    point.updateMatrix();

    for (var i = 0; i < point.geometry.faces.length; i++) {

      point.geometry.faces[i].color = color;

    }
    if (point.matrixAutoUpdate) {
      point.updateMatrix();
    }
    subgeo.merge(point.geometry, point.matrix);
  }







  function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseMove(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance / 1000;

    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseUp(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize(event) {
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1500 ? 1500 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  //-------------------------------------------------------------------------------------------------
  var location;

  function addSpot(latitude, longtitude) {

    var spot = new THREE.Mesh(new THREE.CircleGeometry(1, 100), new THREE.MeshBasicMaterial({ color: "blue", wireframe: true }));
    var phi = (90 - latitude) * Math.PI / 180;
    var theta = (180 - longtitude) * Math.PI / 180;


    spot.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    spot.position.y = 200 * Math.cos(phi);
    spot.position.z = 200 * Math.sin(phi) * Math.sin(theta);


    spot.lookAt(mesh.position);

    scene.add(spot);
    //spot.cursor = 'pointer';
    spot.visible = false;
    location = spot;
    toScreenPosition(spot, camera);
    spotAdded = true;


  }

  function toScreenPosition(obj, camera) {
    var vector = new THREE.Vector3();

    var widthHalf = 0.5 * renderer.context.canvas.width;
    var heightHalf = 0.5 * renderer.context.canvas.height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);

    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = - (vector.y * heightHalf) + heightHalf;

    return {
      x: vector.x,
      y: vector.y
    };

  };

  var rotationDeg = 1;
  function render() {
    if (spin) {
      rotation.x += rotationSpeed * 0.01

    } else {

      zoom(curZoomSpeed);

      rotation.x += (target.x - rotation.x) * rotationSpeed * 0.01;
      rotation.y += (target.y - rotation.y) * rotationSpeed * 0.01;
      //console.log("rotation.x: " + String(rotation.x) + " rotation.y: " + String(rotation.y));
      //rotation.x +=  (firstRotationTarget.x - rotation.x) * 0.0001;
      //rotation.y +=  0.1;
      //x:121 y:203 z:312
      // originRotx 1.88 roty 0.52
      // rotx 3.19 roty 0.04
      distance += (distanceTarget - distance) * zoomSpeed * 0.03;


    }
    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
    //console.log("%cx: " + String(camera.position.x) + " y: " + String(camera.position.y) + " z: " + String(camera.position.z), 'color:#32CD32;');
    camera.lookAt(mesh.position);
    renderer.render(scene, camera);

    update();




  }

  var enlarged = 0;
  var shrinked = 0;
  var spotAdded = false;


  function update() {
    if (spotAdded) {
      var adjustment = 30 / 2
      document.getElementById("spot").style.left = String(toScreenPosition(location, camera).x - adjustment) + "px";
      document.getElementById("spot").style.top = String(toScreenPosition(location, camera).y - adjustment) + "px";

      document.getElementById("window").style.left = String(toScreenPosition(location, camera).x - adjustment - 183) + "px";
      document.getElementById("window").style.bottom = String($(document).height() - toScreenPosition(location, camera).y + 10) + "px";
    }
    if (distance < 950) {

      $("#spot").show();


    }
    if (distance < 500) {
      //$("#container").fadeOut();
    }

  }

  var recorded = false;

  function elasticEffect() {

    if (enlarged <= 60) {
      location.scale.x += 0.7;
      location.scale.y += 0.7;
      enlarged += 10;

    } else {
      if (shrinked <= 60) {
        location.scale.x -= 0.2;
        location.scale.y -= 0.2;
        shrinked += 10;
      } else {
        effectExecuted = true;
        if (!recorded) {
          x = location.scale.x;
          y = location.scale.y;
          originalDistance = distance;
          recorded = true;
        }

      }
    }

  }




  function updateEarth(num, rs, zs) {

    zoomSpeed = zs;
    rotationSpeed = rs;
    switch (num) {
      case 1:

        target.x = 6.5;
        target.y = 0.53;
        distanceTarget = 900;
        addSpot(28.12, 112.59);
        break;
      case 2:

        //distanceTarget = 100;
        break;

    }

  }

  function moveToCenter(spot) {
    //alert("yes");
    
    var screenCenterX = $(window).width() / 2;
    var screenCenterY = $(window).height() / 2;

    var spotCurrentX = spot.offsetLeft;
    var spotCurrentY = spot.offsetTop;
    //console.log(screenCenterX);
    //console.log(spotCurrentX );
    var rotationX = (spotCurrentX - screenCenterX) ;
    var rotationY = (spotCurrentY - screenCenterY) ;

    rotation.x += 0.1
    rotation.y += 0.1
    //rotationSpeed = 2;
    //target.x += rotationX;
    //target.y += rotationY;

    console.log(spotCurrentX);
    console.log(spotCurrentY);
  }


  this.moveToCenter = moveToCenter;
  this.updateEarth = updateEarth;
  init();
  this.animate = animate;


  this.__defineGetter__('time', function () {
    return this._time || 0;
  });

  this.__defineSetter__('time', function (t) {
    var validMorphs = [];
    var morphDict = this.points.morphTargetDictionary;
    for (var k in morphDict) {
      if (k.indexOf('morphPadding') < 0) {
        validMorphs.push(morphDict[k]);
      }
    }
    validMorphs.sort();
    var l = validMorphs.length - 1;
    var scaledt = t * l + 1;
    var index = Math.floor(scaledt);
    for (i = 0; i < validMorphs.length; i++) {
      this.points.morphTargetInfluences[validMorphs[i]] = 0;
    }
    var lastIndex = index - 1;
    var leftover = scaledt - index;
    if (lastIndex >= 0) {
      this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
    }
    this.points.morphTargetInfluences[index] = leftover;
    this._time = t;
  });

  this.addData = addData;
  this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;

  return this;

};

