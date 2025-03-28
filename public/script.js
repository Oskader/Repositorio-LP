// Configuración de Supabase
const SUPABASE_URL = 'https://ufrrttmrjopwzowzjcnz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcnJ0dG1yam9wd3pvd3pqY256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMTUyMjYsImV4cCI6MjA1ODY5MTIyNn0.LzHsMlrQZ4pOL4A0BVEffpvXNaWsF_odTdlSjAdpphQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Función para registrar usuario
async function registerUser(name, email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name
        }
      }
    });
    
    if (error) throw error;
    alert('✅ Registro exitoso. Verifica tu correo!');
    window.location.href = 'login.html';
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Función para iniciar sesión
async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;
    alert('✅ Inicio de sesión exitoso');
    window.location.href = 'index.html';
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Función para cerrar sesión
async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    alert('✅ Sesión cerrada correctamente');
    window.location.href = 'index.html';
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Verificar usuario autenticado
async function checkLoggedInUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user || error) {
            console.error("Usuario no autenticado:", error);
            return null;
        }
        
        // Verificar que el usuario exista en la tabla 'users'
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

        if (dbError || !dbUser) {
            console.error("Usuario no registrado en la tabla users:", dbError);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error("Error verificando usuario:", error);
        return null;
    }
}

// Subir PDF a Supabase Storage
async function uploadPDF(file) {
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
}

// Manejar agregar proyecto
async function addProject(projectData) {
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
}

// Obtener proyectos del usuario
async function getUserProjects() {
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
}

// Mostrar proyectos en la interfaz
async function displayProjects(showActions = false) {
  try {
    const projects = await getUserProjects();
    const resultsSection = document.getElementById("results");
    
    if (!resultsSection) return;

    resultsSection.innerHTML = projects.map(project => `
      <article class="result-item">
        ${showActions ? `
          <div class="project-actions">
            <button onclick="redirectToEdit('${project.id}')" class="btn-edit">✏️ Editar</button>
            <button onclick="deleteProject('${project.id}')" class="btn-delete">🗑️ Eliminar</button>
          </div>
        ` : ''}
        <h2><a href="${project.pdf_url}" target="_blank">${project.title}</a></h2>
        <p class="author">Autores: ${project.authors}</p>
        <p class="abstract">${project.abstract}</p>
        <p class="source">Publicación: ${project.publication_date}</p>
      </article>
    `).join("");

    // Mostrar mensaje si no hay proyectos
    const noProjectsMessage = document.getElementById("no-projects-message");
    if (noProjectsMessage) {
      noProjectsMessage.style.display = projects.length === 0 ? "block" : "none";
    }
  } catch (error) {
    console.error(error);
  }
}

// Eliminar proyecto
async function deleteProject(projectId) {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
    await displayProjects(true);
    alert('✅ Proyecto eliminado correctamente');
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Actualizar proyecto
async function updateProject(projectId, updatedData) {
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
}

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
        resultsSection.innerHTML = data.map(project => `
          <article class="result-item">
            <h2><a href="${project.pdf_url}" target="_blank">${project.title}</a></h2>
            <p class="author">Autores: ${project.authors}</p>
            <p class="abstract">${project.abstract}</p>
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
  
  if (window.location.pathname.endsWith("library.html")) {
    if (!user) {
      alert("🔒 Debes iniciar sesión.");
      window.location.href = "login.html";
      return;
    }
    await displayProjects(true);
  }
  
  if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    await displayProjects(false);
  }
});