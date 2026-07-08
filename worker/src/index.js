export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==================== CATÁLOGO ====================
      if (path === '/api/catalog' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT clave, descripcion AS desc, tipo, unidad, marca, ancho, calibre, largo, kg, rapido, formula, litros, presentacion_de, imagen FROM catalog'
        ).all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (path === '/api/catalog' && method === 'POST') {
        const body = await request.json();
        await env.DB.prepare(
          'INSERT OR REPLACE INTO catalog (clave, descripcion, tipo, unidad, marca, ancho, calibre, largo, kg, rapido, formula, litros, presentacion_de, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          body.clave, body.desc || body.descripcion, body.tipo, body.unidad, body.marca || '',
          body.ancho || null, body.calibre || null, body.largo || null,
          body.kg || null, body.rapido || 0, body.formula || '',
          body.litros || null, body.presentacion_de || null, body.imagen || ''
        ).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      if (path.startsWith('/api/catalog/') && method === 'PUT') {
        const clave = path.split('/')[3];
        const body = await request.json();
        await env.DB.prepare(
          'UPDATE catalog SET descripcion=?, tipo=?, unidad=?, marca=?, ancho=?, calibre=?, largo=?, kg=?, rapido=?, formula=?, litros=?, presentacion_de=?, imagen=? WHERE clave=?'
        ).bind(
          body.desc || body.descripcion, body.tipo, body.unidad, body.marca || '',
          body.ancho || null, body.calibre || null, body.largo || null,
          body.kg || null, body.rapido || 0, body.formula || '',
          body.litros || null, body.presentacion_de || null, body.imagen || '', clave
        ).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      if (path.startsWith('/api/catalog/') && method === 'DELETE') {
        const clave = path.split('/')[3];
        await env.DB.prepare('DELETE FROM catalog WHERE clave = ?').bind(clave).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ==================== RECETAS ====================
      if (path === '/api/recipes' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM recipes').all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (path === '/api/recipes' && method === 'POST') {
        const body = await request.json();
        const { meta } = await env.DB.prepare(
          'INSERT INTO recipes (name, tipo, descripcion, humedad, permitir_secado_rapido, permitir_aislamiento, permitir_refuerzos, permitir_pintura, permitir_resistente, imagen, productos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          body.name, body.tipo || 'muro', body.descripcion || '', body.humedad || 0, body.permitir_secado_rapido || 0,
          body.permitir_aislamiento || 0, body.permitir_refuerzos || 0,
          body.permitir_pintura || 0, body.permitir_resistente || 0,
          body.imagen || '', JSON.stringify(body.productos || [])
        ).run();
        return Response.json({ success: true, id: meta.last_row_id }, { headers: corsHeaders });
      }

      if (path.startsWith('/api/recipes/') && method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        await env.DB.prepare(
          'UPDATE recipes SET name=?, tipo=?, descripcion=?, humedad=?, permitir_secado_rapido=?, permitir_aislamiento=?, permitir_refuerzos=?, permitir_pintura=?, permitir_resistente=?, imagen=?, productos=? WHERE id=?'
        ).bind(
          body.name, body.tipo || 'muro', body.descripcion || '', body.humedad || 0, body.permitir_secado_rapido || 0,
          body.permitir_aislamiento || 0, body.permitir_refuerzos || 0,
          body.permitir_pintura || 0, body.permitir_resistente || 0,
          body.imagen || '', JSON.stringify(body.productos || []), id
        ).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      if (path.startsWith('/api/recipes/') && method === 'DELETE') {
        const id = path.split('/')[3];
        await env.DB.prepare('DELETE FROM recipes WHERE id = ?').bind(id).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ==================== PROYECTOS ====================
      if (path === '/api/projects' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (path === '/api/projects' && method === 'POST') {
        const body = await request.json();
        await env.DB.prepare(
          'INSERT INTO projects (name, fecha, inputs, results) VALUES (?, ?, ?, ?)'
        ).bind(body.name, body.fecha, JSON.stringify(body.inputs), JSON.stringify(body.results)).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      if (path.startsWith('/api/projects/') && method === 'DELETE') {
        const id = path.split('/')[3];
        await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ==================== SUBIDA DE IMÁGENES ====================
      if (path === '/api/upload' && method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || !file.name) {
          return Response.json({ error: 'No se envió ningún archivo' }, { status: 400, headers: corsHeaders });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          return Response.json({ error: 'Solo se permiten imágenes PNG, JPG o WebP' }, { status: 400, headers: corsHeaders });
        }

        const extension = file.name.split('.').pop();
        const key = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;

        await env.IMAGENES.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        const publicUrl = `https://drywall-api.adrian-valle-a.workers.dev/images/${key}`;
        return Response.json({ success: true, url: publicUrl }, { headers: corsHeaders });
      }

      // ==================== SERVIR IMÁGENES ====================
      if (path.startsWith('/images/') && method === 'GET') {
        const key = path.split('/images/')[1];
        if (!key) {
          return new Response('Not Found', { status: 404 });
        }

        const object = await env.IMAGENES.get(key);
        if (!object) {
          return new Response('Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000');
        return new Response(object.body, { headers });
      }

      // ==================== LOGIN ====================
      if (path === '/api/login' && method === 'POST') {
        const body = await request.json();
        if (body.user === 'admin' && body.pass === 'admin123') {
          return Response.json({ success: true }, { headers: corsHeaders });
        }
        return Response.json({ success: false }, { status: 401, headers: corsHeaders });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
};