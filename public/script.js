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
        pdfUrl: pdfUrl,
        userEmail: loggedInUser.email
    };
    projects.push(project);
    saveProjectsToLocalStorage();
    displayProjects();
    window.location.href = "library.html"; // Redirigir aquí
}

// Función para manejar el envío del formulario
document.getElementById("project-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita que el formulario se envíe de forma tradicional

    // Obtén los valores del formulario
    const title = document.getElementById("title").value;
    const authors = document.getElementById("authors").value;
    const publicationDate = document.getElementById("publication-date").value;
    const abstract = document.getElementById("abstract").value;
    const pdfFile = document.getElementById("pdf-file").files[0]; // Archivo PDF seleccionado

    // Validación de campos
    if (!title || !authors || !publicationDate || !abstract || !pdfFile) {
        alert("❌ Completa todos los campos obligatorios");
        return;
    }

    // Configuración de Cloudinary
    const cloudName = "repositorio-lp"; // Reemplaza con tu Cloud Name
    const uploadPreset = "pdf_upload"; // Reemplaza con el nombre de tu Upload Preset

    // Subir el archivo a Cloudinary
    const formData = new FormData();
    formData.append("file", pdfFile); // Archivo PDF
    formData.append("upload_preset", uploadPreset); // Upload Preset

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        const data = await response.json();

        if (data.secure_url) {
            // Guardar los datos del proyecto con la URL del PDF
            addProject(title, authors, publicationDate, abstract, data.secure_url);

            alert("✅ Proyecto agregado correctamente");
            window.location.href = "library.html"; // Redirigir a la biblioteca
        } else {
            alert("❌ Error al subir el archivo PDF");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("❌ Ocurrió un error al subir el archivo");
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
    if (pdfUrl) {
        // Crear un enlace temporal para descargar el archivo
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = pdfUrl.split('/').pop(); // Nombre del archivo
        document.body.appendChild(link);
        link.click(); // Simular clic en el enlace
        document.body.removeChild(link); // Eliminar el enlace temporal
    } else {
        alert("❌ El archivo PDF no está disponible.");
    }
}

window.onload = () => {
    loadUsersFromLocalStorage();
    loadProjectsFromLocalStorage();
    if (window.location.pathname.endsWith("index.html")) displayProjects();
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