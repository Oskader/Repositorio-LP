let projects = [];

function addProject(title, authors, publicationDate, abstract, pdfUrl) {
    const loggedInUser = checkLoggedInUser();
    if (!loggedInUser) {
        alert("❌ Debes iniciar sesión para agregar proyectos.");
        return false;
    }

    // Verificar si el proyecto ya existe
    const exists = projects.some(p => p.title === title && p.userEmail === loggedInUser.email);
    if (exists) {
        alert("⚠️ Ya existe un proyecto con este título");
        return false;
    }

    const project = {
        id: Date.now(),
        title: title,
        authors: authors,
        publicationDate: publicationDate,
        abstract: abstract,
        pdfUrl: pdfUrl,
        userEmail: loggedInUser.email
    };
    
    projects.push(project);
    saveProjectsToLocalStorage();
    return true; // Solo retornamos éxito, la redirección se maneja fuera
}

// Función para manejar el envío del formulario
// Nuevo event listener con carga segura
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('project-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Obtener valores del formulario
            const title = document.getElementById('title').value;
            const authors = document.getElementById('authors').value;
            const publicationDate = document.getElementById('publication-date').value;
            const abstract = document.getElementById('abstract').value;
            const pdfFile = document.getElementById('pdf-file').files[0];

            // Validación
            if (!title || !authors || !publicationDate || !abstract || !pdfFile) {
                alert('❌ Completa todos los campos obligatorios');
                return;
            }

            try {
                // Subir a Cloudinary
                const cloudName = "repositorio-lp";
                const uploadPreset = "pdf_upload";
                const formData = new FormData();
                formData.append('file', pdfFile);
                formData.append('upload_preset', uploadPreset);

                console.log('Iniciando subida a Cloudinary...'); // Debug

                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
                    { method: 'POST', body: formData }
                );

                const data = await response.json();
                console.log('Respuesta de Cloudinary:', data); // Debug

                if (data.secure_url) {
                    const success = addProject(title, authors, publicationDate, abstract, data.secure_url);
                    if (success) {
                        alert('✅ Proyecto agregado correctamente');
                        window.location.href = 'library.html';
                    }
                } else {
                    throw new Error('No se obtuvo URL del archivo');
                }
            } catch (error) {
                console.error('Error completo:', error); // Debug detallado
                alert('❌ Error al subir el archivo: ' + error.message);
            }
        });
    }
});

function saveProjectsToLocalStorage() {
    localStorage.setItem("projects", JSON.stringify(projects));
}

function loadProjectsFromLocalStorage() {
    const storedProjects = localStorage.getItem("projects");
    projects = storedProjects ? JSON.parse(storedProjects) : [];
}

function displayProjects(filteredProjects = projects, showActions = false) {
    const resultsSection = document.getElementById("results");
    if (!resultsSection) return;

    resultsSection.innerHTML = filteredProjects.map(project => `
        <article class="result-item">
            ${showActions ? `
                <div class="project-actions">
                    <button onclick="redirectToEdit(${project.id})" class="btn-edit">✏️ Editar</button>
                    <button onclick="deleteProject(${project.id})" class="btn-delete">🗑️ Eliminar</button>
                </div>
            ` : ''}
            <h2><a href="#" onclick="openPDF('${project.pdfUrl}')">${project.title}</a></h2>
            <p class="author">Autores: ${project.authors}</p>
            <p class="abstract">${project.abstract}</p>
            <p class="source">Publicación: ${project.publicationDate}</p>
        </article>
    `).join("");
}

function openPDF(pdfUrl) {
    if (!pdfUrl) {
        alert("❌ El archivo PDF no está disponible.");
        return;
    }

    // Forzar parámetros de transformación para descarga
    let downloadUrl = pdfUrl;
    
    // Si es URL de Cloudinary, añadir parámetros de transformación
    if (pdfUrl.includes('cloudinary.com')) {
        // Opción 1: Añadir flag de descarga
        downloadUrl = pdfUrl.replace(/\/upload\//, '/upload/fl_attachment/');
        
        // Opción 2: Alternativa más robusta
        // downloadUrl = pdfUrl.split('?')[0] + '?dl=1';
    }

    console.log("URL de descarga:", downloadUrl); // Para depuración
    
    // Crear enlace temporal
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'proyecto_' + Date.now() + '.pdf'; // Nombre único
    link.target = '_blank'; // Abrir en nueva pestaña como respaldo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.onload = () => {
    loadUsersFromLocalStorage();
    loadProjectsFromLocalStorage(); // Asegúrate de cargar los proyectos
    
    // Verifica la ruta actual para decidir qué mostrar
    if (window.location.pathname.endsWith("index.html") || 
        window.location.pathname === "/") {
        displayProjects(projects, false);
    }
};

let users = []; // Asegúrate de que esta línea esté al inicio del archivo

function loadUsersFromLocalStorage() {
    const storedUsers = localStorage.getItem("users");
    users = storedUsers ? JSON.parse(storedUsers) : [];
}

function saveUsersToLocalStorage() {
    localStorage.setItem("users", JSON.stringify(users));
}

// Registrar un nuevo usuario
function registerUser(name, email, password) {
    const user = {
        name: name,
        email: email,
        password: password, // ¡En un entorno real, esto debería estar encriptado!
    };
    users.push(user);
    saveUsersToLocalStorage();
    alert("✅ Usuario registrado correctamente");
    window.location.href = "login.html"; // Redirigir al login después del registro
}

// Iniciar sesión
function loginUser(email, password) {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        alert("✅ Inicio de sesión exitoso");
        localStorage.setItem("loggedInUser", JSON.stringify(user)); // Guardar usuario logueado
        window.location.href = "index.html"; // Redirigir al inicio
    } else {
        alert("❌ Correo electrónico o contraseña incorrectos");
    }
}

// Verificar si hay un usuario logueado
function checkLoggedInUser() {
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (loggedInUser) {
        return JSON.parse(loggedInUser);
    }
    return null;
}

// Cerrar sesión
function logoutUser() {
    localStorage.removeItem("loggedInUser");
    alert("✅ Sesión cerrada correctamente");
    window.location.href = "index.html"; // Redirigir al inicio
}

// Función para buscar proyectos
function searchProjects(query) {
    const filteredProjects = projects.filter(project => {
        return (
            project.title.toLowerCase().includes(query.toLowerCase()) ||
            project.authors.toLowerCase().includes(query.toLowerCase()) ||
            project.abstract.toLowerCase().includes(query.toLowerCase())
        );
    });
    displayProjects(filteredProjects); // Usar displayProjects en lugar de displayFilteredProjects
}

// Función para eliminar proyecto
function deleteProject(projectId) {
    projects = projects.filter(project => project.id !== projectId);
    saveProjectsToLocalStorage();
    
    // Recargar proyectos en library.html
    if (window.location.pathname.endsWith("library.html")) {
        const loggedInUser = checkLoggedInUser();
        const userProjects = projects.filter(p => p.userEmail === loggedInUser?.email);
        
        // Mostrar u ocultar el mensaje
        const noProjectsMessage = document.getElementById("no-projects-message");
        if (userProjects.length === 0) {
            noProjectsMessage.style.display = "block"; // Mostrar mensaje
        } else {
            noProjectsMessage.style.display = "none"; // Ocultar mensaje
        }
        
        displayProjects(userProjects, true); // Actualizar lista
    }
}

// Función para redirigir a edición
function redirectToEdit(projectId) {
    window.location.href = `edit-project.html?id=${projectId}`;
}

// Función para actualizar proyecto
function updateProject(projectId, updatedData) {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex > -1) {
        projects[projectIndex] = { ...projects[projectIndex], ...updatedData };
        saveProjectsToLocalStorage();
    }
}