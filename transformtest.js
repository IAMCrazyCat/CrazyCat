
import * as THREE from './libraries/three/three.module.js'
import { OrbitControls } from './libraries/three/OrbitControls.js';
import { TransformControls } from './libraries/three/TransformControls.js';
import { OBJLoader } from './libraries/three/OBJLoader.js';
import { MTLLoader } from './libraries/three/MTLLoader.js';

//Initialise global variables
var effectController;     
var floorTexture;
var meshFloor;
var floor1Material, wood4Material, wood5Material, wood6Material, wood7Material, wood8Material, greybrickMaterial, brick1Material, brick2Material; // initialise floor materials
var scene, camera, renderer, controls, transformCtrls;
var furniture = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var plane = new THREE.Plane();
var pNormal = new THREE.Vector3(0, 1, 0); // plane's normal
var planeIntersect = new THREE.Vector3(); // point of intersection with the plane
var pIntersect = new THREE.Vector3(); // point of intersection with an object (plane's point)
var shift = new THREE.Vector3(); // distance between position of an object and points of intersection with the object
var isDragging = false;
var dragObject;
var loadingManager;
var pointLight;
var isMovableLight = false;
var isNight = true;
var light;
var directionalLight;
init();


function init() {
scene = new THREE.Scene();

scene.background = new THREE.CubeTextureLoader();

	.load( [
		'./bg/night/px.jpg',
		'./bg/night/nx.jpg',
		'./bg/night/py.jpg',
		'./bg/night/ny.jpg',
		'./bg/night/pz.jpg',
		'./bg/night/nz.jpg'
  ] );
  
camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(20, 30, 50);
camera.lookAt(scene.position);
renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

//create controls - claudia
controls = new OrbitControls(camera, renderer.domElement); //camera orbit 
transformCtrls = new TransformControls(camera, renderer.domElement);//rotation gizmo
transformCtrls.showX = ! transformCtrls.showX;//disable x coordinate
transformCtrls.showZ = ! transformCtrls.showZ;//disable z coordinate

light = new THREE.AmbientLight( 0xffffff ); // soft white light
scene.add( light ); // add enviroment light -- Christian 
light.visible = false;

directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
scene.add( directionalLight );
directionalLight.visible = true;


 // TEXTURE LOADER
 var loader = new THREE.TextureLoader();
 loader.crossOrigin = ''; //Allow cross origin loading

 // TEXTURE MAPS
 var floor1Map = loader.load( 'img/floor1.jpg' );
 floor1Map.wrapS = floor1Map.wrapT = THREE.RepeatWrapping;
 floor1Map.repeat = new THREE.Vector2(4,4);

 var wood4Map = loader.load( 'img/wood4.jpg' );
 wood4Map.wrapS = wood4Map.wrapT = THREE.RepeatWrapping;
 wood4Map.repeat = new THREE.Vector2(4,4);

 var wood5Map = loader.load( 'img/wood5.jpg' );
 wood5Map.wrapS = wood5Map.wrapT = THREE.RepeatWrapping;
 wood5Map.repeat = new THREE.Vector2(4,4);

 var wood6Map = loader.load( 'img/wood6.png' );
 wood6Map.wrapS = wood6Map.wrapT = THREE.RepeatWrapping;
 wood6Map.repeat = new THREE.Vector2(4,4);

 var wood7Map = loader.load( 'img/wood7.jpg' );
 wood7Map.wrapS = wood7Map.wrapT = THREE.RepeatWrapping;
 wood7Map.repeat = new THREE.Vector2(4,4);

 var greybrickMap = loader.load( 'img/greybrick.jpg' );
 greybrickMap.wrapS = greybrickMap.wrapT = THREE.RepeatWrapping;
 greybrickMap.repeat = new THREE.Vector2(4,4);

 var brick1Map = loader.load( 'img/brick1.jpg' );
 brick1Map.wrapS = brick1Map.wrapT = THREE.RepeatWrapping;
 brick1Map.repeat = new THREE.Vector2(4,4);

 var brick2Map = loader.load( 'img/brick2.jpg' );
 brick2Map.wrapS = brick2Map.wrapT = THREE.RepeatWrapping;
 brick2Map.repeat = new THREE.Vector2(4,4);

 // MATERIALS
 floor1Material = new THREE.MeshBasicMaterial( { map: floor1Map, side: THREE.DoubleSide } );
 wood4Material = new THREE.MeshBasicMaterial( { map: wood4Map, side: THREE.DoubleSide } );
 wood5Material = new THREE.MeshBasicMaterial( { map: wood5Map, side: THREE.DoubleSide } );
 wood6Material = new THREE.MeshBasicMaterial( { map: wood6Map, side: THREE.DoubleSide } );
 wood7Material = new THREE.MeshBasicMaterial( { map: wood7Map, side: THREE.DoubleSide } );
 wood8Material = new THREE.MeshBasicMaterial( { map: loader.load( 'img/wood8.png' ), side: THREE.DoubleSide } );
 greybrickMaterial = new THREE.MeshBasicMaterial( { map: greybrickMap, side: THREE.DoubleSide } );
 brick1Material = new THREE.MeshBasicMaterial( { map: brick1Map, side: THREE.DoubleSide } );
 brick2Material = new THREE.MeshBasicMaterial( { map: brick2Map, side: THREE.DoubleSide } );
 

 //christians light cube
//random coloured cubes
var geometry = new THREE.BoxGeometry (1,1,1);
for (var i = 0; i <1; i++) {
var object = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( {color: Math.random() * 0xffffff}));

var randomX = Math.random() * 8-4; 
var randomY = Math.random() * 0-0;
var randomZ = Math.random() * 8-4;

object.position.x = randomX;
object.position.y = randomY;
object.position.z = randomZ;
 // Random light with object --Christian
pointLight = new THREE.PointLight( 0xffffff, 1, 100 );
pointLight.position.set( randomX, randomY, randomZ ); 
scene.add( pointLight );

object.castShadow=true;
object.receiveShadow=true;

scene.add(object);//add cubes to scene
furniture.push(object);//add cubes to furniture array

}
 // GUI
 setupGui();

 //add furniture
 addFurnitures();

 alert("---------------------------------------------\n" 
 + "Mouse clicks to move and orbit \n" 
 + "R to activate rotation slider\n" 
 + "C to clone an object. \n"
 + "Space to change the background \n"
 + "---------------------------------------------\n" );
}


// OBJ + MTL loader here ------------------------------------

function addFurnitures() {

  var mtlLoader = new MTLLoader();
  loadingManager = new THREE.LoadingManager();
  
  var textureloader = new THREE.TextureLoader();
  textureloader.load('models/Wood.jpg',function(){
  mtlLoader.load('models/house_empty.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/house_empty.obj', function(object) {
     
      object.position.x = 100;
      object.position.y = -1;
      object.position.z = -20;
      object.scale.set(1.5,2.5,1.5)
      scene.add(object);


    });
  });
  });

  mtlLoader.load('models/tv_stand.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/tv_stand.obj', function(object) {
      
        object.position.x = -28;
        object.position.y = -1;
        object.position.z = 2;
        object.scale.set(0.1,0.1,0.12)
      scene.add(object);
      furniture.push(object);
  
    });
  });

  mtlLoader.load('models/tv.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/tv.obj', function(object) {
      
        object.position.x = -20;
        object.position.y = 1;
        object.position.z = 30;

        object.rotation.y = 3.2
        object.scale.set(0.01,0.01,0.01)
      scene.add(object);
      furniture.push(object);
  
    });
  });
  
  
  mtlLoader.load('models/bed.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/bed.obj', function(object) {
      
        object.position.x = -20;
        object.position.y = -1;
        object.position.z = 10;
        object.scale.set(0.05,0.05,0.05)
      scene.add(object);
     
  
    });
  });


  mtlLoader.load('models/cybertruck.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/cybertruck.obj', function(object) {
      
      object.position.x = 40;
      object.position.y = -2;
      object.position.z = 0;
      object.scale.set(3,3,3)
      scene.add(object);
     

    });
  
  });

  mtlLoader.load('models/lamp_street_2.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/lamp_street_2.obj', function(object) {
      
      var x = 35;
      var y = -3;
      var z = 15;
      object.position.x = x;
      object.position.y = y;
      object.position.z = z;

      //object.rotation.x = 1.55
      object.rotation.y = -1.5;
      object.scale.set(0.5, 0.5, 0.5)

      var pointLight = new THREE.PointLight( 0xFFFF00, 1, 10 );
      pointLight.position.set( x + 1, y + 10, z + 4 ); 
      scene.add(pointLight);
      scene.add(object);
  

    });
  
  });

  var textureloader = new THREE.TextureLoader();
  textureloader.load('models/Wood.jpg',function(){
  mtlLoader.load('models/table.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/table.obj', function(object) {
      
      object.position.x = -16;
      object.position.y = 0.1;
      object.position.z = -13;
      // object.castShadow = true;
      // object.receiveShadow = true;
      //object.rotation.x = 1.55
      //object.rotation.y = 3.15
      object.scale.set(1,1,1)
      scene.add(object);
      furniture.push(object)
    });
  });
  
  });


  var textureloader = new THREE.TextureLoader();
  textureloader.load('models/grass_texture/grass.jpg',function(){
  mtlLoader.load('models/grass.mtl', function(materials) {
    materials.preload();
    var objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('models/grass.obj', function(object) {
      
      object.position.x = 11.5;
      object.position.y = -6.5;
      object.position.z = 2.8;

      object.rotation.x = 1.55
      object.rotation.y = 3.15
      object.scale.set(0.5,0.5,0.5)
      scene.add(object);
   

    });
  
  });
});


var textureloader = new THREE.TextureLoader();
textureloader.load('models/study_chair_cm.jpg',function(){
mtlLoader.load('models/chair1.mtl', function(materials) {
  materials.preload();
  var objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('models/chair1.obj', function(object) {
    
    object.position.x = 10;
    object.position.y = 3;
    object.position.z = -10;
    object.scale.set(7,7,7)
    scene.add(object);
    furniture.push(object);

  });
});
});
 
var textureloader = new THREE.TextureLoader();
textureloader.load('models/wood.jpg',function(){
mtlLoader.load('models/chair2.mtl', function(materials) {
  materials.preload();
  var objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('models/chair2.obj', function(object) {
    
    object.position.x = -16;
    object.position.y = -1;
    object.position.z = -20;
    object.scale.set(0.1,0.1,0.1)
    scene.add(object);
    furniture.push(object);

  });
});
});

var textureloader = new THREE.TextureLoader();
textureloader.load('models/greytable.jpg',function(){
mtlLoader.load('models/table1.mtl', function(materials) {
  materials.preload();
  var objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('models/table1.obj', function(object) {
    
    object.position.x = 20;
    object.position.y = -2;
    object.position.z = -10;
    object.scale.set(1,1,1)
    scene.add(object);
    furniture.push(object);

  });
});
});

var textureloader = new THREE.TextureLoader();
textureloader.load('models/dead_in_a_vase_by_textureific.jpg',function(){
mtlLoader.load('models/flower-vase.mtl', function(materials) {
  materials.preload();
  var objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('models/flower-vase.obj', function(object) {
    
    object.position.x = 20;
    object.position.y = 1;
    object.position.z = 10;
    object.scale.set(1,1,1)
    scene.add(object);
    furniture.push(object);

  });
});
});

}



function setupGui() {
            
  effectController = {
      newFloor: "floor1",
  };

  var h;

  var gui = new dat.GUI();

  // ATTRIBUTES

  h = gui.addFolder( "Textures" );

  h.add ( effectController, "newFloor", [ "floor1", "wood4", "wood5", "wood6", "wood7", "wood8", "greybrick", "brick1", "brick2" ] ).name( "Floor" ).onChange( render );
  
}

function render() {
  
  if ( effectController.newFloor !== floorTexture ) {
          
          floorTexture = effectController.newFloor;

          createNewRoom();
       };
  
  renderer.render(scene,camera);
}

function createNewRoom() {
  
  if ( meshFloor !== undefined ) {

      meshFloor.geometry.dispose();
      scene.remove ( meshFloor );
  }

  var geometry_floor = new THREE.BoxGeometry(59,2,60); //Instantiate a geometry to use
  meshFloor = new THREE.Mesh( geometry_floor,  
                              floorTexture === "floor1" ? floor1Material : (
                              floorTexture === "wood4" ? wood4Material : (
                              floorTexture === "wood5" ? wood5Material : (
                              floorTexture === "wood6" ? wood6Material : (
                              floorTexture === "wood7" ? wood7Material : (
                              floorTexture === "wood8" ? wood8Material : (
                              floorTexture === "greybrick" ? greybrickMaterial : (
                              floorTexture === "brick1" ? brick1Material : brick2Material )))))))); // Instatiate the mesh with the geometry and material
  meshFloor.position.y-=1;
  meshFloor.position.x=1.1;
  meshFloor.position.z=3;
  scene.add(meshFloor);
}



//MOVEMENT CONTROLS - CLAUDIA
// event listener for mouse movement
document.addEventListener("mousemove", event => {

  //read the mouse position in relation to window
  	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
  
    //if an object is being dragged, move it along the plane 
    if (isDragging) {
    	raycaster.ray.intersectPlane(plane, planeIntersect);
      dragObject.position.addVectors(planeIntersect, shift);   

      if (dragObject.name =="")
      {
        pointLight.position.x = dragObject.position.x;
        pointLight.position.y = dragObject.position.y;
        pointLight.position.z = dragObject.position.z;
      }
    }
});

//event listener for mouse click
document.addEventListener("mousedown", () => {
 //if the raycaster intersect with an element in the furniture array, then... 
  var intersects = raycaster.intersectObjects(furniture, true);
  if (intersects.length > 0) {
    controls.enabled = false; //disable the camera from orbiting
    pIntersect.copy(intersects[0].point);//set the object to the plane
    plane.setFromNormalAndCoplanarPoint(pNormal, pIntersect);
    shift.subVectors(intersects[0].object.position, intersects[0].point);
    isDragging = true; //something is being dragged
    dragObject = intersects[0].object;//add the raycasted object to dragObject variable
    transformCtrls.attach(dragObject);//add transformControls to the dragObject
    
  } 
  else if (intersects.length == 0) {
    controls.enabled=true;//clicking off will enable orbit camera
    scene.remove(transformCtrls); //clicking off the object will remove rotaion gizmo
  }
} );

//event listener for click release 
document.addEventListener("mouseup", () => {
	isDragging = false;//nothing is being dragged
  dragObject = null;//there is nothing in dragObject variable
} );

//event listener for keys
document.body.addEventListener('keydown', keyPressed);
function keyPressed(e){
  switch(e.key) {
   
        case 'r': //R to enable rotation
        controls.enabled = false; //disable orbit
        transformCtrls.enabled = true; //enable transform
        scene.add(transformCtrls);//add transform gizmo to scene
        transformCtrls.setMode('rotate');//set it to only rotate
        break;

        case 'c':
        var newObject = dragObject.clone();
        newObject.position.x = dragObject.position.x + 10;
        newObject.position.y = dragObject.position.y;
        newObject.position.z = dragObject.position.z;
        
        newObject.scale.set(dragObject.scale.x, dragObject.scale.y, dragObject.scale.z);
        scene.add(newObject);
        furniture.push(newObject);
        break;

        case ' ':
          if (isNight == true){
          scene.background = new THREE.CubeTextureLoader() // switch to noon
          .load( [
            './bg/noon/px.jpg',
            './bg/noon/nx.jpg',
            './bg/noon/py.jpg',
            './bg/noon/ny.jpg',
            './bg/noon/pz.jpg',
            './bg/noon/nz.jpg'
          ] );

          isNight = false;
          light.visible = true;
          directionalLight.visible = false;
        }
          else{
            scene.background = new THREE.CubeTextureLoader() // switch to night
          .load( [
            './bg/night/px.jpg',
            './bg/night/nx.jpg',
            './bg/night/py.jpg',
            './bg/night/ny.jpg',
            './bg/night/pz.jpg',
            './bg/night/nz.jpg'
          ] );
          isNight = true;
          light.visible = false;
          directionalLight.visible = true;
          
          }
       
        break;
  }
}


var MyUpdateLoop = function ( )
{

  render();
//finally perform a recoursive call to update again
//this must be called because the mouse change the camera position
requestAnimationFrame(MyUpdateLoop);

};

MyUpdateLoop();

//this function is called when the window is resized
var MyResize = function ( )
{
var width = window.innerWidth;
var height = window.innerHeight;
renderer.setSize(width,height);
camera.aspect = width/height;
camera.updateProjectionMatrix();
renderer.render(scene,camera);
};

//link the resize of the window to the update of the camera
window.addEventListener( 'resize', MyResize);


// OBJ + MTL loader here ------------------------------------
//white chair




