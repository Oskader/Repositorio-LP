// Configuración de Supabase
const SUPABASE_URL = 'https://wmrjlpzwmhlphzdpplcl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcmpscHp3bWhscGh6ZHBwbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTYxNTcsImV4cCI6MjA1ODc5MjE1N30.s51lyIpWv8NIMfNiJfYwYbb-rJnG17_BbVYHxD5YxOo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== FUNCIONES GLOBALES ====================

// Función para redirigir a edición
window.redirectToEdit = function(projectId) {
    window.location.href = `edit-project.html?id=${projectId}`;
};

// Registro de usuario
window.registerUser = async function(name, email, password) {
    if (!email.endsWith('@presentacionsogamoso.edu.co')) {
        alert('❌ Error: Solo se permiten correos institucionales');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { name: name },
                emailRedirectTo: window.location.origin
            }
        });

        if (error) {
            console.error("Error de Supabase:", error);
            if (error.message.includes("Failed to fetch")) {
                throw new Error("Error de conexión. Verifica tu internet");
            }
            throw error;
        }

        if (!data.user) {
            throw new Error("Registro incompleto. Verifica tu correo");
        }

        alert('✅ Registro exitoso!');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error("Error completo:", error);
        let mensaje = "Error en registro: ";
        
        if (error.message.includes("internet")) {
            mensaje += "Sin conexión a internet";
        } else if (error.message.includes("already registered")) {
            mensaje += "Usuario ya registrado";
        } else {
            mensaje += error.message || "Intenta nuevamente";
        }
        
        alert(`❌ ${mensaje}`);
    }
};

// Inicio de sesión
window.loginUser = async function(email, password) {
    if (!email.endsWith('@presentacionsogamoso.edu.co')) {
        alert('❌ Error: Solo se permiten correos del dominio @presentacionsogamoso.edu.co');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        
        // Forzar recarga para actualizar el estado
        window.location.href = "index.html?t=" + Date.now();
        
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
};

// Cerrar sesión
window.logoutUser = async function() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        alert('✅ Sesión cerrada correctamente');
        window.location.href = 'index.html';
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
};

// Verificar usuario autenticado
window.checkLoggedInUser = async function() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user) return null;

        // Obtener nombre desde la tabla 'users'
        const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

        return { ...user, name: userData?.name || user.email };
    } catch (error) {
        console.error("Error verificando usuario:", error);
        return null;
    }
};

// Función para actualizar la UI de autenticación
window.updateAuthUI = async function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const user = await checkLoggedInUser();
    
    if (user) {
        container.innerHTML = `
        <div class="user-info">
            <i class="fas fa-user-circle"></i>
            <span class="user-name">${user.name}</span>
            <a href="#" onclick="logoutUser()" class="btn-logout">Cerrar sesión</a>
        </div>
        `;
    } else {
        container.innerHTML = '<a href="login.html" class="btn-login">Iniciar sesión</a>';
    }
};

// Subir PDF a Supabase Storage
window.uploadPDF = async function(file) {
    try {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file);

        if (error) throw error;
        return `${SUPABASE_URL}/storage/v1/object/public/pdfs/${data.path}`;
    } catch (error) {
        throw new Error(`Error subiendo PDF: ${error.message}`);
    }
};

// Manejar agregar proyecto
window.addProject = async function(projectData) {
    try {
        const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        throw new Error(`Error guardando proyecto: ${error.message}`);
    }
};

// Obtener proyectos del usuario
window.getUserProjects = async function() {
    try {
        const user = await checkLoggedInUser();
        if (!user) return [];
        
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Mostrar proyectos en la interfaz
window.displayProjects = async function(isPrivateLibrary = false) {
    try {
        let query = supabase.from('projects').select('*');
        const user = await checkLoggedInUser();
        const isAdmin = user?.email === 'oscar.samuel.cardenas@gmail.com' || 
                       user?.email === 'oscarcardenas@presentacionsogamoso.edu.co';

        // Configurar query para biblioteca privada
        if (isPrivateLibrary) {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            query = query.eq('user_id', user.id);
        }

        const { data: projects, error } = await query;

        if (error) {
            console.error("Error de Supabase:", error);
            throw error;
        }

        const resultsSection = document.getElementById("results");
        const noProjectsMessage = document.getElementById("no-projects-message");

        // Validar elementos del DOM
        if (!resultsSection) {
            console.error("No se encontró #results en el DOM");
            return;
        }

        // Limpiar resultados
        resultsSection.innerHTML = "";

        // Manejar estado vacío solo para biblioteca
        if (isPrivateLibrary && noProjectsMessage) {
            noProjectsMessage.style.display = projects.length === 0 ? "block" : "none";
        }

        if (projects.length === 0) {
            if (isPrivateLibrary && noProjectsMessage) {
                noProjectsMessage.style.display = "block";
            }
            return;
        }

        // Renderizar proyectos
        resultsSection.innerHTML = projects.map(project => {
            const isOwner = user?.id === project.user_id;
            
            return `
            <article class="result-item">
                ${(isPrivateLibrary || isAdmin) ? `
                <div class="project-actions">
                    ${isPrivateLibrary && isOwner ? `
                    <button onclick="redirectToEdit('${project.id}')" class="btn-edit">✏️ Editar</button>
                    ` : ''}
                    <button onclick="deleteProject('${project.id}')" 
                        class="btn-delete ${isAdmin ? 'admin-delete' : ''}">
                        🗑️ ${isAdmin ? 'Eliminar (Admin)' : 'Eliminar'}
                    </button>
                </div>
                ` : ''}
                <h2><a href="${project.pdf_url}" target="_blank">${project.title}</a></h2>
                <p class="author">Autores: ${project.authors}</p>
                <div class="abstract-container">
                    <button class="btn-abstract" onclick="toggleAbstract('${project.id}')">
                        🔍 Ver resumen
                    </button>
                    <div id="abstract-${project.id}" class="abstract-content hidden">
                        ${project.abstract}
                    </div>
                </div>
                <p class="source">Publicación: ${project.publication_date}</p>
            </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Error cargando proyectos:", error);
        alert("⚠️ No se pudieron cargar los proyectos");
    }
};

// Eliminar proyecto
window.deleteProject = async function(projectId) {
    try {
        const user = await checkLoggedInUser();
        if (!user) {
            alert('🔒 Debes iniciar sesión');
            return;
        }

        // Obtener información del proyecto para el mensaje
        const { data: project } = await supabase
            .from('projects')
            .select('title, user_id')
            .eq('id', projectId)
            .single();

        const isAdmin = user.email === 'oscar.samuel.cardenas@gmail.com' || 
                       user.email === 'oscarcardenas@presentacionsogamoso.edu.co';
        const isOwner = user.id === project?.user_id;

        let mensaje = '';
        if (isAdmin && !isOwner) {
            mensaje = `⚠️ Estás eliminando un proyecto de otro usuario:\n"${project?.title}"\n¿Continuar?`;
        } else {
            mensaje = `¿Estás seguro de eliminar el proyecto:\n"${project?.title}"?`;
        }

        if (!confirm(mensaje)) {
            return; // El usuario canceló
        }

        if (isAdmin || isOwner) {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (error) throw error;
            
            const isLibrary = window.location.pathname.endsWith('library.html');
            await displayProjects(isLibrary);
            alert('✅ Proyecto eliminado' + (isAdmin ? ' (Admin)' : ''));
        }

    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
};

window.isProjectOwner = async function(projectId, userId) {
    const { data } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

    return data?.user_id === userId;
};

// Actualizar proyecto
window.updateProject = async function(projectId, updatedData) {
    try {
        const { data, error } = await supabase
            .from('projects')
            .update(updatedData)
            .eq('id', projectId)
            .select();

        if (error) throw error;
        alert('✅ Proyecto actualizado correctamente');
        return data[0];
    } catch (error) {
        throw new Error(`Error actualizando proyecto: ${error.message}`);
    }
};

// Función para mostrar/ocultar resumen
window.toggleAbstract = function(projectId) {
    const abstractContent = document.getElementById(`abstract-${projectId}`);
    if (!abstractContent) return;
    
    const button = abstractContent.previousElementSibling;
    if (!button) return;
    
    abstractContent.classList.toggle('hidden');
    button.innerHTML = abstractContent.classList.contains('hidden') 
        ? '🔍 Ver resumen' 
        : '📖 Ocultar resumen';
};

// ==================== EVENT LISTENERS ====================

// Event Listener para formulario de agregar proyecto
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('project-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const user = await checkLoggedInUser();
            
            if (!user) {
                alert('❌ Debes iniciar sesión para agregar proyectos');
                window.location.href = 'login.html';
                return;
            }
            
            // Verificar que el user.id existe
            if (!user.id) {
                alert('❌ Error: No se pudo obtener el ID del usuario');
                return;
            }

            const formData = new FormData(e.target);
            const pdfFile = document.getElementById('pdf-file').files[0];

            try {
                const pdfUrl = await uploadPDF(pdfFile);
                
                await addProject({
                    title: formData.get('title'),
                    authors: formData.get('authors'),
                    publication_date: formData.get('publication-date'),
                    abstract: formData.get('abstract'),
                    pdf_url: pdfUrl,
                    user_id: user.id
                });

                alert('✅ Proyecto agregado correctamente');
                window.location.href = 'library.html';
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        });
    }
});

// Manejar búsqueda de proyectos
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('search-input').value.toLowerCase();
            
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .or(`title.ilike.%${query}%,authors.ilike.%${query}%,abstract.ilike.%${query}%`);

                if (error) throw error;
                
                const resultsSection = document.getElementById("results");
                if (!resultsSection) return;
                
                resultsSection.innerHTML = data.map(project => `
                    <article class="result-item">
                        <h2><a href="${project.pdf_url}" target="_blank">${project.title}</a></h2>
                        <p class="author">Autores: ${project.authors}</p>
                        <div class="abstract-container">
                            <button class="btn-abstract" onclick="toggleAbstract('${project.id}')">
                                🔍 Ver resumen
                            </button>
                            <div id="abstract-${project.id}" class="abstract-content hidden">
                                ${project.abstract}
                            </div>
                        </div>
                        <p class="source">Publicación: ${project.publication_date}</p>
                    </article>
                `).join("");
            } catch (error) {
                console.error(error);
            }
        });
    }
});

// Cargar proyectos al iniciar
window.addEventListener('load', async () => {
    const user = await checkLoggedInUser();
    
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        await displayProjects(false);
    }
});

// Actualizar UI de autenticación en todas las páginas
document.addEventListener('DOMContentLoaded', async () => {
    // Actualizar UI de autenticación si existe el contenedor
    if (document.getElementById('login-button-container')) {
        await updateAuthUI('login-button-container');
    }
});