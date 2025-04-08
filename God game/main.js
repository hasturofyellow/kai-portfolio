// Initialize Babylon.js Engine
const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = () => {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1); // Sky blue

    // 🎥 Camera (Top-Down God View)
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 40, new BABYLON.Vector3(0, 5, 0), scene);
    camera.attachControl(canvas, true);

    // ☀️ Lighting
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;

    // 🌿 Ground (Village Terrain)
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/grass.jpg", scene);
    ground.material = groundMat;

    // 🌲 Create Trees (Randomly Placed)
    for (let i = 0; i < 15; i++) {
        const treeTrunk = BABYLON.MeshBuilder.CreateCylinder("trunk", { diameter: 1, height: 5 }, scene);
        treeTrunk.position.x = Math.random() * 80 - 40;
        treeTrunk.position.z = Math.random() * 80 - 40;
        treeTrunk.material = new BABYLON.StandardMaterial("trunkMat", scene);
        treeTrunk.material.diffuseColor = new BABYLON.Color3(0.5, 0.25, 0);

        const treeLeaves = BABYLON.MeshBuilder.CreateSphere("leaves", { diameter: 4 }, scene);
        treeLeaves.position.set(treeTrunk.position.x, treeTrunk.position.y + 3, treeTrunk.position.z);
        treeLeaves.material = new BABYLON.StandardMaterial("leavesMat", scene);
        treeLeaves.material.diffuseColor = new BABYLON.Color3(0, 0.8, 0.2);
    }

    // 🏡 Create Huts (Simple Domes)
    for (let i = 0; i < 5; i++) {
        const hut = BABYLON.MeshBuilder.CreateCylinder("hut", { diameter: 5, height: 3, tessellation: 6 }, scene);
        hut.position.x = Math.random() * 60 - 30;
        hut.position.z = Math.random() * 60 - 30;
        hut.material = new BABYLON.StandardMaterial("hutMat", scene);
        hut.material.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/roof.jpg", scene);
    }

    // 🎭 Create an Array to Store NPCs
    let npcs = [];

    // 👤 Load Humanoid (Dude.babylon)
    function createNPC(x, z) {
        BABYLON.SceneLoader.ImportMesh("", "assets/dude/", "dude.babylon", scene, function (meshes, particleSystems, skeletons) {
            const dude = meshes[0];
            dude.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
            dude.position = new BABYLON.Vector3(x, 0, z);
            dude.skeleton = skeletons[0] || null;
            dude.isMoving = false;
    
            npcs.push(dude);
        });
    }
    

    // Spawn Multiple NPCs
    for (let i = 0; i < 5; i++) {
        createNPC(Math.random() * 20 - 10, Math.random() * 20 - 10);
    }

   
    let player;
    let selectedCharacter = null;
    let selectionRing = null;


    // // Load the player (initially)
    BABYLON.SceneLoader.ImportMesh("", "assets/dude/", "dude.babylon", scene, function (meshes, particleSystems, skeletons) {
        player = meshes[0];
        player.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
        player.position = new BABYLON.Vector3(0, 0, 0);
        player.skeleton = skeletons[0] || null;
        player.isMoving = false;
    });
    

    selectionRing = BABYLON.MeshBuilder.CreateTorus("selectionRing", {
        diameter: 24,
        thickness: 3,
        tessellation: 30
    }, scene);
    
    selectionRing.rotation.x = 0; // Flat to ground
    selectionRing.position.y = 0.3; // ~1 foot in Babylon units
    selectionRing.isVisible = false;
    
    const ringMaterial = new BABYLON.StandardMaterial("ringMat", scene);
    ringMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0); // Bright green
    ringMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    ringMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    selectionRing.material = ringMaterial;
    

     // 🎯 Click-to-Move Functionality
    let moveTarget = null;
    scene.onPointerDown = function (evt, pickResult) {
        if (pickResult.hit) {
            const pickedMesh = pickResult.pickedMesh;
    
            // Check if a character is clicked
            const clickedCharacter = npcs.concat(player).find(character => {
                return pickedMesh === character || pickedMesh.isDescendantOf(character);
            });
    
            if (clickedCharacter) {
                moveTarget = clickedCharacter.position
                selectedCharacter = clickedCharacter;
                selectionRing.isVisible = true;
                selectionRing.parent = selectedCharacter;
            } else if (selectedCharacter) {
                // Move selected character to target point
                moveTarget = pickResult.pickedPoint;
            }
        }
    };
    

    scene.onBeforeRenderObservable.add(() => {
        if (selectedCharacter && moveTarget) {
            const distance = BABYLON.Vector3.Distance(selectedCharacter.position, moveTarget);
    
            if (distance > 0.5) {
                selectedCharacter.isMoving = true;
    
                if (selectedCharacter.skeleton && !selectedCharacter._animating) {
                    scene.beginAnimation(selectedCharacter.skeleton, 0, 100, true);
                    selectedCharacter._animating = true;
                }
    
                const direction = moveTarget.subtract(selectedCharacter.position);
                const targetAngle = Math.atan2(direction.x, direction.z) + Math.PI;
                selectedCharacter.rotation.y = BABYLON.Scalar.LerpAngle(selectedCharacter.rotation.y, targetAngle, 0.1);
    
                selectedCharacter.position = BABYLON.Vector3.Lerp(selectedCharacter.position, moveTarget, 0.02);
            } else {
                moveTarget = null;
                selectedCharacter.isMoving = false;
    
                if (selectedCharacter.skeleton && selectedCharacter._animating) {
                    scene.stopAnimation(selectedCharacter.skeleton);
                    selectedCharacter._animating = false;
                }
            }
        }
    });
    
    
    

    return scene;
};

// 🚀 Initialize Scene
const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());