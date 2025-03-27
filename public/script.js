import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://ufrrttmrjopwzowzjcnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcnJ0dG1yam9wd3pvd3pqY256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTUyMjYsImV4cCI6MjA1ODY5MTIyNn0.LzHsMlrQZ4pOL4A0BVEffpvXNaWsF_odTdlSjAdpphQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== AUTENTICACIÓN ====================
async function registerUser(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { name: name }
        }
    });
    
    if (error) {
        alert("❌ Error: " + error.message);
        return;
    }
    alert("✅ Registro exitoso. Verifica tu correo.");
    window.location.href = "login.html";
}

async function loginUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("❌ Error: " + error.message);
        return;
    }
    window.location.href = "index.html";
}

async function checkLoggedInUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = "index.html";
}

// ==================== MANEJO DE PDFs ====================
async function uploadPDF(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file);

    if (error) throw error;
    
    const { data: urlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(data.path);
    
    return urlData.publicUrl;
}

// ==================== MANEJO DE PROYECTOS ====================
async function addProject(projectData) {
    const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();

    return !error;
}

async function loadUserProjects() {
    const user = await checkLoggedInUser();
    if (!user) return [];
    
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);
    
    return data || [];
}

async function deleteProject(projectId) {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (!error && window.location.pathname.endsWith("library.html")) {
        const projects = await loadUserProjects();
        const noProjectsMessage = document.getElementById("no-projects-message");
        noProjectsMessage.style.display = projects.length === 0 ? "block" : "none";
        displayProjects(projects, true);
    }
}

async function updateProject(projectId, updatedData) {
    const { error } = await supabase
        .from('projects')
        .update(updatedData)
        .eq('id', projectId);

    return !error;
}

// ==================== FUNCIONES DE UI ====================
function displayProjects(filteredProjects = [], showActions = false) {
    const resultsSection = document.getElementById("results");
    if (!resultsSection) return;

    resultsSection.innerHTML = filteredProjects.map(project => `
        <article class="result-item">
            ${showActions ? `
                <div class="project-actions">
                    <button onclick="redirectToEdit('${project.id}')" class="btn-edit">✏️ Editar</button>
                    <button onclick="deleteProject('${project.id}')" class="btn-delete">🗑️ Eliminar</button>
                </div>
            ` : ''}
            <h2><a href="#" onclick="openPDF('${project.pdf_url}')">${project.title}</a></h2>
            <p class="author">Autores: ${project.authors}</p>
            <p class="abstract">${project.abstract}</p>
            <p class="source">Publicación: ${project.publication_date}</p>
        </article>
    `).join("");
}

function openPDF(pdfUrl) {
    if (!pdfUrl) {
        alert("❌ El archivo PDF no está disponible.");
        return;
    }
    
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.target = "_blank";
    link.click();
}

function redirectToEdit(projectId) {
    window.location.href = `edit-project.html?id=${projectId}`;
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Manejar formulario de proyectos
    const form = document.getElementById('project-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('title').value;
            const authors = document.getElementById('authors').value;
            const publicationDate = document.getElementById('publication-date').value;
            const abstract = document.getElementById('abstract').value;
            const pdfFile = document.getElementById('pdf-file').files[0];

            if (!title || !authors || !publicationDate || !abstract || !pdfFile) {
                alert('❌ Completa todos los campos obligatorios');
                return;
            }

            try {
                const pdfUrl = await uploadPDF(pdfFile);
                const user = await checkLoggedInUser();

                const projectData = {
                    title,
                    authors,
                    publication_date: publicationDate,
                    abstract,
                    pdf_url: pdfUrl,
                    user_id: user.id
                };

                const success = await addProject(projectData);
                if (success) {
                    alert('✅ Proyecto agregado correctamente');
                    window.location.href = 'library.html';
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        });
    }

    // Cargar proyectos en index.html
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        (async () => {
            const { data: projects } = await supabase
                .from('projects')
                .select('*');
            displayProjects(projects || [], false);
        })();
    }
});

// ==================== INICIALIZACIÓN ====================
window.onload = async () => {
    // Manejar library.html
    if (window.location.pathname.endsWith("library.html")) {
        const user = await checkLoggedInUser();
        if (!user) {
            alert("🔒 Debes iniciar sesión.");
            window.location.href = "login.html";
            return;
        }

        const projects = await loadUserProjects();
        if (projects.length === 0) {
            document.getElementById("no-projects-message").style.display = "block";
        } else {
            displayProjects(projects, true);
        }
    }
};