let projects = [];

function addProject(title, authors, publicationDate, abstract, pdfFile) {
    const loggedInUser = checkLoggedInUser();
    if (!loggedInUser) {
        alert("❌ Debes iniciar sesión para agregar proyectos.");
        return;
    }

    const project = {
        id: Date.now(), // ID único
        title: title,
        authors: authors,
        publicationDate: publicationDate,
        abstract: abstract,
        pdfFile: pdfFile,
        userEmail: loggedInUser.email
    };
    projects.push(project);
    saveProjectsToLocalStorage();
    displayProjects();
    window.location.href = "library.html"; // Redirigir aquí
}

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
            <h2><a href="#" onclick="openPDF('${project.pdfFile}')">${project.title}</a></h2>
            <p class="author">Autores: ${project.authors}</p>
            <p class="abstract">${project.abstract}</p>
            <p class="source">Publicación: ${project.publicationDate}</p>
        </article>
    `).join("");
}

function openPDF(filename) {
    if (filename) {
        // Ruta al archivo PDF (asumiendo que está en la carpeta "pdfs")
        const pdfPath = `pdfs/${filename}`;

        // Crear un enlace temporal para descargar el archivo
        const link = document.createElement('a');
        link.href = pdfPath;
        link.download = filename; // Forzar la descarga del archivo
        document.body.appendChild(link);
        link.click(); // Simular clic en el enlace
        document.body.removeChild(link); // Eliminar el enlace temporal

        // Verificar si el archivo existe
        fetch(pdfPath)
            .then(response => {
                if (!response.ok) {
                    alert("❌ El archivo PDF no está disponible.");
                }
            })
            .catch(() => {
                alert("❌ El archivo PDF no está disponible.");
            });
    } else {
        alert("❌ El archivo PDF no está disponible.");
    }
}

window.onload = () => {
    loadUsersFromLocalStorage();
    loadProjectsFromLocalStorage();
    if (window.location.pathname.endsWith("index.html")) displayProjects();
};

// Cargar usuarios desde LocalStorage al iniciar
function loadUsersFromLocalStorage() {
    const storedUsers = localStorage.getItem("users");
    users = storedUsers ? JSON.parse(storedUsers) : [];
}

// Guardar usuarios en LocalStorage
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
    displayFilteredProjects(filteredProjects);
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
    if(projectIndex > -1) {
        projects[projectIndex] = {...projects[projectIndex], ...updatedData};
        saveProjectsToLocalStorage();
    }
}