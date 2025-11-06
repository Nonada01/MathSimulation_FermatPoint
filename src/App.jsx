import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const SoapBubbleSimulation = () => {
  const mountRef = useRef(null);
  const [isDipping, setIsDipping] = useState(false);
  const [hasFilm, setHasFilm] = useState(false);
  const [isBlowing, setIsBlowing] = useState(false);
  const [filmType, setFilmType] = useState('none');
  const [selectedShape, setSelectedShape] = useState('tetrahedron');
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const shapeRef = useRef(null);
  const filmRef = useRef(null);
  const fermatLinesRef = useRef(null);
  const strawRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const isDraggingStrawRef = useRef(false);
  const isDraggingShapeRef = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfff0f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Create bucket
    const bucketGroup = new THREE.Group();
    const bucketGeometry = new THREE.CylinderGeometry(2, 2, 3, 32, 1, true);
    const bucketMaterial = new THREE.MeshPhongMaterial({
      color: 0xeeeeee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const bucket = new THREE.Mesh(bucketGeometry, bucketMaterial);
    bucketGroup.add(bucket);

    const liquidGeometry = new THREE.CylinderGeometry(1.95, 1.95, 2.8, 32);
    const liquidMaterial = new THREE.MeshPhongMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.4
    });
    const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
    liquid.position.y = -0.1;
    bucketGroup.add(liquid);

    bucketGroup.position.y = -3;
    scene.add(bucketGroup);

    // Create straw
    const strawGroup = new THREE.Group();
    const strawGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 16);
    const strawMaterial = new THREE.MeshPhongMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.9
    });
    const straw = new THREE.Mesh(strawGeometry, strawMaterial);
    straw.rotation.z = Math.PI / 4;
    strawGroup.add(straw);

    const tipGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const tipMaterial = new THREE.MeshPhongMaterial({
      color: 0xff1493,
      emissive: 0xff69b4,
      emissiveIntensity: 0.3
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(-0.88, 0.88, 0);
    strawGroup.add(tip);

    strawGroup.position.set(3, 2, 2);
    strawGroup.visible = false;
    scene.add(strawGroup);
    strawRef.current = strawGroup;

    // Create initial shape
    initShape(selectedShape, scene);

    // Mouse interaction
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      
      if (strawRef.current && strawRef.current.visible) {
        const intersects = raycaster.intersectObjects(strawRef.current.children, true);
        if (intersects.length > 0) {
          isDraggingStrawRef.current = true;
          return;
        }
      }
      
      isDraggingShapeRef.current = true;
    };

    const onMouseUp = (e) => {
      if (isDraggingStrawRef.current) {
        const rect = renderer.domElement.getBoundingClientRect();
        const distance = Math.sqrt(
          (e.clientX - previousMousePosition.x) ** 2 + 
          (e.clientY - previousMousePosition.y) ** 2
        );
        
        if (distance < 10 && filmType === 'fermat') {
          blowFilm();
        }
      }
      
      isDraggingStrawRef.current = false;
      isDraggingShapeRef.current = false;
    };

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDraggingStrawRef.current && strawRef.current) {
        raycaster.setFromCamera(mouseRef.current, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        if (intersectPoint) {
          strawRef.current.position.x = intersectPoint.x;
          strawRef.current.position.y = intersectPoint.y;
        }
      } else if (isDraggingShapeRef.current && shapeRef.current) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y
        };

        shapeRef.current.rotation.y += deltaMove.x * 0.01;
        shapeRef.current.rotation.x += deltaMove.y * 0.01;
      }

      previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };

      // Update cursor
      if (strawRef.current && strawRef.current.visible) {
        raycaster.setFromCamera(mouseRef.current, camera);
        const intersects = raycaster.intersectObjects(strawRef.current.children, true);
        renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
      } else {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (shapeRef.current && !isDraggingShapeRef.current && !isDraggingStrawRef.current) {
        shapeRef.current.rotation.y += 0.005;
      }

      // Sync fermat structure rotation
      if (fermatLinesRef.current && shapeRef.current) {
        fermatLinesRef.current.rotation.copy(shapeRef.current.rotation);
      }

      // Sync surface film rotation
      if (filmRef.current && shapeRef.current) {
        filmRef.current.rotation.copy(shapeRef.current.rotation);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const createTetrahedron = () => {
    const geometry = new THREE.BufferGeometry();
    const a = 1.5;
    const h = a * Math.sqrt(2/3);
    
    const vertices = new Float32Array([
      0, h, 0,
      -a/2, 0, -a/(2*Math.sqrt(3)),
      a/2, 0, -a/(2*Math.sqrt(3)),
      0, 0, a/Math.sqrt(3)
    ]);
    
    const indices = [0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2];
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  };

  const createOctahedron = () => {
    const geometry = new THREE.BufferGeometry();
    const s = 1.5;
    
    const vertices = new Float32Array([
      s, 0, 0, -s, 0, 0, 0, s, 0, 0, -s, 0, 0, 0, s, 0, 0, -s
    ]);
    
    const indices = [
      2, 0, 4, 2, 4, 1, 2, 1, 5, 2, 5, 0,
      3, 4, 0, 3, 1, 4, 3, 5, 1, 3, 0, 5
    ];
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  };

  const initShape = (shapeType, scene) => {
    let geometry;
    switch (shapeType) {
      case 'tetrahedron':
        geometry = createTetrahedron();
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        break;
      case 'octahedron':
        geometry = createOctahedron();
        break;
      default:
        geometry = createTetrahedron();
    }

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff6b9d, 
      linewidth: 3 
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    
    const sphereGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const sphereMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      emissive: 0xff6b9d,
      emissiveIntensity: 0.3
    });
    
    const positions = geometry.getAttribute('position');
    const vertices = new Set();
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i).toFixed(3);
      const y = positions.getY(i).toFixed(3);
      const z = positions.getZ(i).toFixed(3);
      const key = `${x},${y},${z}`;
      
      if (!vertices.has(key)) {
        vertices.add(key);
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        );
        wireframe.add(sphere);
      }
    }
    
    wireframe.position.y = 2;
    scene.add(wireframe);
    shapeRef.current = wireframe;
  };

  const handleShapeChange = (shape) => {
    setSelectedShape(shape);
    
    if (shapeRef.current) {
      sceneRef.current.remove(shapeRef.current);
    }
    if (filmRef.current) {
      sceneRef.current.remove(filmRef.current);
      filmRef.current = null;
    }
    if (fermatLinesRef.current) {
      sceneRef.current.remove(fermatLinesRef.current);
      fermatLinesRef.current = null;
    }
    if (strawRef.current) {
      strawRef.current.visible = false;
    }
    
    initShape(shape, sceneRef.current);
    setIsDipping(false);
    setHasFilm(false);
    setFilmType('none');
  };

  const handleDip = () => {
    if (!shapeRef.current || isDipping) return;
    
    setIsDipping(true);
    
    const startY = shapeRef.current.position.y;
    const endY = -2.5;
    const duration = 2000;
    const startTime = Date.now();

    const animateDip = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      if (progress < 0.5) {
        shapeRef.current.position.y = startY + (endY - startY) * easeProgress * 2;
      } else {
        shapeRef.current.position.y = endY + (startY - endY) * (easeProgress - 0.5) * 2;
      }

      if (progress < 1) {
        requestAnimationFrame(animateDip);
      } else {
        setIsDipping(false);
        createFermatStructure();
      }
    };

    animateDip();
  };

  const createFermatStructure = () => {
    if (fermatLinesRef.current) {
      sceneRef.current.remove(fermatLinesRef.current);
    }

    const fermatGroup = new THREE.Group();
    
    let geometry;
    switch (selectedShape) {
      case 'tetrahedron':
        geometry = createTetrahedron();
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        break;
      case 'octahedron':
        geometry = createOctahedron();
        break;
      default:
        geometry = createTetrahedron();
    }

    const positions = geometry.getAttribute('position');
    const vertexList = [];
    const vertices = new Set();
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i).toFixed(3);
      const y = positions.getY(i).toFixed(3);
      const z = positions.getZ(i).toFixed(3);
      const key = `${x},${y},${z}`;
      
      if (!vertices.has(key)) {
        vertices.add(key);
        vertexList.push(new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        ));
      }
    }

    // Calculate centroid (Fermat point)
    const centroid = new THREE.Vector3();
    vertexList.forEach(v => centroid.add(v));
    centroid.divideScalar(vertexList.length);

    // Get edges from the shape
    const edges = new THREE.EdgesGeometry(geometry);
    const edgePositions = edges.getAttribute('position');
    
    // Create film on each edge connecting to center
    const filmMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      shininess: 100
    });

    // Create triangular films from center to each edge
    for (let i = 0; i < edgePositions.count; i += 2) {
      const v1 = new THREE.Vector3(
        edgePositions.getX(i),
        edgePositions.getY(i),
        edgePositions.getZ(i)
      );
      const v2 = new THREE.Vector3(
        edgePositions.getX(i + 1),
        edgePositions.getY(i + 1),
        edgePositions.getZ(i + 1)
      );

      // Create triangle from center to edge
      const triangleGeometry = new THREE.BufferGeometry();
      const triangleVertices = new Float32Array([
        centroid.x, centroid.y, centroid.z,
        v1.x, v1.y, v1.z,
        v2.x, v2.y, v2.z
      ]);
      triangleGeometry.setAttribute('position', new THREE.BufferAttribute(triangleVertices, 3));
      triangleGeometry.computeVertexNormals();
      
      const triangleMesh = new THREE.Mesh(triangleGeometry, filmMaterial);
      fermatGroup.add(triangleMesh);
    }

    // Add center point
    const centerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const centerMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ddff,
      emissiveIntensity: 0.5
    });
    const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
    centerSphere.position.copy(centroid);
    fermatGroup.add(centerSphere);

    // Add lines from center to vertices for clarity
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ddff,
      transparent: true,
      opacity: 0.4,
      linewidth: 2
    });

    vertexList.forEach(vertex => {
      const points = [centroid, vertex];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      fermatGroup.add(line);
    });

    fermatGroup.position.copy(shapeRef.current.position);
    fermatGroup.rotation.copy(shapeRef.current.rotation);
    
    sceneRef.current.add(fermatGroup);
    fermatLinesRef.current = fermatGroup;
    
    setHasFilm(true);
    setFilmType('fermat');
    
    if (strawRef.current) {
      strawRef.current.visible = true;
    }
  };

  const blowFilm = () => {
    if (!fermatLinesRef.current || filmType !== 'fermat' || isBlowing) return;
    
    setIsBlowing(true);

    const duration = 1500;
    const startTime = Date.now();

    const animateBlow = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      fermatLinesRef.current.children.forEach(child => {
        if (child instanceof THREE.Line) {
          child.material.opacity = 0.6 * (1 - progress);
        } else if (child.type === 'Mesh' && child.geometry.type === 'SphereGeometry') {
          child.material.opacity = 1 * (1 - progress);
        } else if (child.type === 'Mesh') {
          child.material.opacity = 0.2 + (0.2 * progress);
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animateBlow);
      } else {
        const savedRotation = fermatLinesRef.current.rotation.clone();
        sceneRef.current.remove(fermatLinesRef.current);
        fermatLinesRef.current = null;
        createSurfaceFilm(savedRotation);
        setIsBlowing(false);
        if (strawRef.current) strawRef.current.visible = false;
      }
    };

    animateBlow();
  };

  const createSurfaceFilm = (rotation) => {
    let geometry;
    switch (selectedShape) {
      case 'tetrahedron':
        geometry = createTetrahedron();
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        break;
      case 'octahedron':
        geometry = createOctahedron();
        break;
      default:
        geometry = createTetrahedron();
    }
    
    const filmMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      shininess: 100,
      specular: 0xffffff
    });

    const film = new THREE.Mesh(geometry, filmMaterial);
    film.position.copy(shapeRef.current.position);
    film.rotation.copy(rotation);
    
    sceneRef.current.add(film);
    filmRef.current = film;
    setFilmType('surface');
  };

  const handleRemoveFilm = () => {
    if (filmRef.current) {
      sceneRef.current.remove(filmRef.current);
      filmRef.current = null;
    }
    if (fermatLinesRef.current) {
      sceneRef.current.remove(fermatLinesRef.current);
      fermatLinesRef.current = null;
    }
    if (strawRef.current) {
      strawRef.current.visible = false;
    }
    setHasFilm(false);
    setFilmType('none');
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-pink-100 to-blue-100 flex flex-col">
      <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-6 shadow-lg">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          🫧 비눗방울 페르마 점 시뮬레이션
        </h1>
        <p className="text-white text-center text-sm">
          3D 다면체를 비눗방울 용액에 담가 페르마 점을 관찰하세요!
        </p>
      </div>

      <div className="flex-1 flex gap-4 p-4">
        <div 
          className="flex-1 relative" 
          ref={mountRef} 
          style={{ minHeight: '500px' }}
        />
        
        <div className="w-80 bg-white rounded-2xl shadow-xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔷</span> 다면체 선택
            </h2>
            <div className="space-y-2">
              {[
                { id: 'tetrahedron', name: '정사면체', emoji: '🔺' },
                { id: 'cube', name: '정육면체', emoji: '🟦' },
                { id: 'octahedron', name: '정팔면체', emoji: '💎' }
              ].map(shape => (
                <button
                  key={shape.id}
                  onClick={() => handleShapeChange(shape.id)}
                  className={`w-full p-3 rounded-xl font-medium transition-all ${
                    selectedShape === shape.id
                      ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{shape.emoji}</span>
                  {shape.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🧪</span> 실험 조작
            </h2>
            <div className="space-y-3">
              <button
                onClick={handleDip}
                disabled={isDipping || hasFilm}
                className={`w-full p-4 rounded-xl font-bold text-lg transition-all ${
                  isDipping || hasFilm
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:scale-105'
                }`}
              >
                {isDipping ? '담그는 중... 💧' : '비눗방울 용액에 담그기 🫧'}
              </button>

              {filmType === 'fermat' && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3">
                  <p className="text-yellow-900 font-bold text-center text-sm">
                    💨 빨대를 드래그해서 움직이고<br/>클릭하여 불어보세요!
                  </p>
                </div>
              )}

              {hasFilm && (
                <button
                  onClick={handleRemoveFilm}
                  className="w-full p-4 rounded-xl font-bold text-lg bg-gradient-to-r from-pink-400 to-red-500 text-white hover:shadow-lg hover:scale-105 transition-all"
                >
                  처음으로 ✨
                </button>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span>💡</span> 페르마 점이란?
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              비눗방울을 다면체에 담그면 내부에 최단 거리로 연결된 선들이 나타납니다. 
              이것이 페르마 점의 원리입니다. 빨대로 불면 표면만 남게 됩니다!
            </p>
          </div>

          <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-200">
            <h3 className="font-bold text-pink-900 mb-2">📝 실험 순서</h3>
            <ol className="text-sm text-pink-800 space-y-1">
              <li>1️⃣ 다면체를 선택</li>
              <li>2️⃣ 용액에 담그기</li>
              <li>3️⃣ 빨대 드래그로 이동</li>
              <li>4️⃣ 빨대 클릭해서 불기</li>
              <li>5️⃣ 표면 막 관찰하기</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoapBubbleSimulation;
