const API_URL = 'https://drywall-api.adrian-valle-a.workers.dev';

export async function fetchCatalog() {
  const res = await fetch(`${API_URL}/api/catalog`);
  if (!res.ok) throw new Error('Error al cargar catálogo');
  return res.json();
}

export async function saveCatalogProduct(product) {
  const res = await fetch(`${API_URL}/api/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error('Error al guardar producto');
  return res.json();
}

export async function updateCatalogProduct(clave, product) {
  const res = await fetch(`${API_URL}/api/catalog/${clave}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error('Error al actualizar producto');
  return res.json();
}

export async function deleteCatalogProduct(clave) {
  const res = await fetch(`${API_URL}/api/catalog/${clave}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar producto');
  return res.json();
}

export async function fetchRecipes() {
  const res = await fetch(`${API_URL}/api/recipes`);
  if (!res.ok) throw new Error('Error al cargar recetas');
  return res.json();
}

export async function saveRecipe(recipe) {
  const res = await fetch(`${API_URL}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) throw new Error('Error al guardar receta');
  return res.json();
}

export async function updateRecipe(id, recipe) {
  const res = await fetch(`${API_URL}/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) throw new Error('Error al actualizar receta');
  return res.json();
}

export async function deleteRecipe(id) {
  const res = await fetch(`${API_URL}/api/recipes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar receta');
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_URL}/api/projects`);
  if (!res.ok) throw new Error('Error al cargar proyectos');
  return res.json();
}

export async function saveProject(project) {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Error al guardar proyecto');
  return res.json();
}

export async function deleteProject(id) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar proyecto');
  return res.json();
}

export async function login(user, pass) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass }),
  });
  if (!res.ok) return { success: false };
  return res.json();
}