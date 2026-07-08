function safeEval(expression, context) {
  let sanitized = expression
    .replace(/\bceil\b/g, 'Math.ceil')
    .replace(/\bfloor\b/g, 'Math.floor')
    .replace(/\bround\b/g, 'Math.round')
    .replace(/\bmax\b/g, 'Math.max')
    .replace(/\bmin\b/g, 'Math.min');
  const allowed = /^[0-9+\-*/().%\s\w.]+$/;
  if (!allowed.test(sanitized)) throw new Error('Expresión inválida');
  const keys = Object.keys(context);
  const values = Object.values(context);
  const func = new Function(...keys, `return ${sanitized};`);
  return func(...values);
}

function findPosteByProfile(ancho, calibre, alto, catalog) {
  const largoDeseado = alto <= 2.44 ? 2.44 : 3.05;
  let poste = catalog.find(p => p && p.tipo === 'poste' && p.ancho === ancho && p.calibre === calibre && p.largo === largoDeseado);
  if (poste) return poste;
  return catalog.find(p => p && p.tipo === 'poste' && p.ancho === ancho && p.calibre === calibre) || null;
}

function findCanalByProfile(ancho, calibre, catalog) {
  return catalog.find(p => p && p.tipo === 'canal' && p.ancho === ancho && p.calibre === calibre) || null;
}

function combinarCompuestos(kgNecesarios, compuestosDisponibles) {
  const validos = compuestosDisponibles.filter(c => c && typeof c.kg === 'number');
  if (validos.length === 0) return [];
  const ordenados = [...validos].sort((a, b) => b.kg - a.kg);
  const resultado = [];
  let restante = kgNecesarios;

  for (let i = 0; i < ordenados.length; i++) {
    const c = ordenados[i];
    if (restante <= 0) break;
    const cant = Math.floor(restante / c.kg);
    if (cant > 0) {
      const nuevoRestante = restante - cant * c.kg;
      if (nuevoRestante > 0 && i + 1 < ordenados.length) {
        const conExtra = (cant + 1) * c.kg;
        const siguiente = ordenados[i + 1];
        const cantSiguiente = Math.ceil(nuevoRestante / siguiente.kg);
        const usandoSiguiente = cant * c.kg + cantSiguiente * siguiente.kg;
        if (conExtra <= usandoSiguiente) {
          resultado.push({ product: c, quantity: cant + 1 });
          restante = 0;
          break;
        }
      }
      resultado.push({ product: c, quantity: cant });
      restante = nuevoRestante;
    } else if (restante > 0 && restante > c.kg * 0.5) {
      resultado.push({ product: c, quantity: 1 });
      restante = 0;
      break;
    }
  }

  if (restante > 0) {
    const menor = ordenados[ordenados.length - 1];
    const existente = resultado.find(r => r.product.clave === menor.clave);
    if (existente) {
      existente.quantity += Math.ceil(restante / menor.kg);
    } else {
      resultado.push({ product: menor, quantity: Math.ceil(restante / menor.kg) });
    }
  }

  return resultado.filter(r => r.quantity > 0);
}

function getTornilloPanelClave(panelClave, calibre) {
  if (panelClave === 'R500077') return 'R500231';
  if (calibre === 20) return 'R500239';
  switch (panelClave) {
    case 'R804171': return 'R522020';
    case 'R807609': case 'R800495': case 'R803499': return 'R500239';
    default: return 'R522020';
  }
}

function esPanelEspecial(panelClave) {
  return ['R807609', 'R800495', 'R803499', 'R500077'].includes(panelClave);
}

function esProtekto(panelClave) {
  return panelClave === 'R500077' || panelClave === 'R803499';
}

// ==================== MURO INTERIOR ====================
export function calculateFromRecipe(recipe, params, catalog) {
  let cat = catalog.filter(p => p != null);

  cat.forEach(p => {
    if (p && p.tipo === 'compuesto') {
      if (p.kg === undefined || p.kg === null) p.kg = 28;
      if (p.rapido === undefined || p.rapido === null) p.rapido = false;
      if (!p.formula) p.formula = '1';
    }
  });

  const {
    largo, alto, esquinas = 0,
    puertas = [], ventanas = [],
    separacionPostes,
    factorCaras,
    nivelCompuestoA,
    nivelCompuestoB,
    anchoPerfil,
    calibre,
    secadoRapido = false,
    aislamiento = false,
    refuerzos = false,
    selectedPanelA,
    selectedPanelB,
    incluirPintura = false,
    pinturaSeleccionada,
    superficie,
    selladorSeleccionado,
    incluirResistenteA = false,
    incluirResistenteB = false,
    adherencia = false,
    incluirSellado = false,
  } = params;

  // ===== POSTES =====
  const postesMuro = Math.ceil(largo / separacionPostes) + 1;
  const largoPoste = alto <= 2.44 ? 2.44 : 3.05;

  let postesAberturas = 0;
  for (const p of puertas) {
    postesAberturas += Math.ceil((p.alto || 2.1) * 2 / largoPoste);
  }
  for (const v of ventanas) {
    postesAberturas += Math.ceil((v.alto || 1.0) * 2 / largoPoste);
  }

  let totalPostes = postesMuro + esquinas + postesAberturas;

  if (alto > 3.05) {
    const tramoRestante = alto - 3.05;
    const desperdicio = 1.10;
    const metrosExtras = totalPostes * tramoRestante * desperdicio;
    const postesExtras = Math.ceil(metrosExtras / 3.05);
    totalPostes += postesExtras;
  }

  // ===== ÁREAS =====
  const areaMuro = largo * alto;
  const areaPuertas = puertas.reduce((s, p) => s + (p.ancho || 0.9) * (p.alto || 2.1), 0);
  const areaVentanas = ventanas.reduce((s, v) => s + (v.ancho || 1.2) * (v.alto || 1.0), 0);
  const areaNeta = Math.max(0, areaMuro - areaPuertas - areaVentanas);
  const areaTotalPanel = areaNeta * (factorCaras || 1);
  const totalLargoCabezales = puertas.reduce((s, p) => s + (p.ancho || 0.9) + 0.2, 0) +
                              ventanas.reduce((s, v) => s + (v.ancho || 1.2) * 2, 0);
  const sumaAnchoPuertas = puertas.reduce((s, p) => s + (p.ancho || 0.9), 0);

  let perimetroAberturas = 0;
  for (const p of puertas) perimetroAberturas += (p.alto || 2.1) * 2 + (p.ancho || 0.9);
  for (const v of ventanas) perimetroAberturas += (v.alto || 1.0) * 2 + (v.ancho || 1.2) * 2;

  const espacios = Math.ceil(largo / separacionPostes);
  const sumaAnchoAberturas = sumaAnchoPuertas + ventanas.reduce((s, v) => s + (v.ancho || 1.2), 0);
  const huecosAberturas = sumaAnchoAberturas > 0 ? Math.ceil(sumaAnchoAberturas / separacionPostes) : 0;
  const huecosEfectivos = Math.max(0, espacios - huecosAberturas);
  const totalTramos = huecosEfectivos > 0
    ? ((huecosEfectivos % 2 === 0) ? 1.5 * huecosEfectivos : 1.5 * huecosEfectivos - 0.5)
    : 0;
  const metrosRefuerzo = (recipe.permitir_refuerzos && refuerzos) ? totalTramos * separacionPostes : 0;
  const extraFramer = (recipe.permitir_refuerzos && refuerzos) ? totalTramos * 4 : 0;

  const context = {
    largo, alto, esquinas, separacionPostes,
    areaMuro, areaNeta, areaTotalPanel,
    totalLargoCabezales,
    puertas: puertas.length, ventanas: ventanas.length,
    factorCaras,
    anchoPerfil, calibre,
    sumaAnchoPuertas,
    metrosRefuerzo,
    extraFramer,
    perimetroAberturas,
    totalPostes,
  };

  const finalProducts = [];

  if (anchoPerfil && calibre) {
    const autoPoste = findPosteByProfile(anchoPerfil, calibre, alto, cat);
    if (autoPoste) finalProducts.push({
      product: autoPoste,
      factor: 1,
      customQuantity: totalPostes,
      customUnit: 'pza(s)'
    });
  }

  if (anchoPerfil && calibre) {
    const autoCanal = findCanalByProfile(anchoPerfil, calibre, cat);
    if (autoCanal) finalProducts.push({ product: autoCanal, factor: 1 });
  }

  if (anchoPerfil && calibre) {
    const framerClave = (recipe.humedad || calibre === 20) ? 'R500242' : 'R500259';
    const tornilloFramer = cat.find(p => p.clave === framerClave);
    if (tornilloFramer) {
      const qtyFramer = Math.ceil((totalPostes * 5 + (puertas.length + ventanas.length) * 2 + extraFramer) * 1.1);
      finalProducts.push({ product: tornilloFramer, factor: 1, customQuantity: qtyFramer, customUnit: 'pza(s)' });
    }
  }

  if (anchoPerfil && calibre) {
    const rebordeClave = recipe.humedad ? 'R801675' : 'R800474';
    const rebordeJ = cat.find(p => p.clave === rebordeClave);
    if (rebordeJ) {
      const largoEfectivo = Math.max(0, largo - sumaAnchoPuertas);
      const qtyReborde = Math.ceil(largoEfectivo * (factorCaras || 1) / 3);
      finalProducts.push({ product: rebordeJ, factor: 1, customQuantity: qtyReborde, customUnit: 'pza(s)' });
    }
  }

  // Taquetes y pijas para fijar canales (10 taquetes por pieza de canal)
  const largoEfectivoTaquetes = Math.max(0, largo - sumaAnchoPuertas);
  const totalCanalPieces = Math.ceil((2 * largoEfectivoTaquetes) / 3.05);
  const cantidadTaquetes = totalCanalPieces * 10;
  const taquete = cat.find(p => p.clave === 'D026');
  if (taquete) {
    finalProducts.push({ product: taquete, factor: 1, customQuantity: cantidadTaquetes, customUnit: 'pza(s)' });
  }
  const pija = cat.find(p => p.clave === 'T44347');
  if (pija) {
    finalProducts.push({ product: pija, factor: 1, customQuantity: Math.ceil(cantidadTaquetes / 100), customUnit: 'bolsa(s)' });
  }

  if (esquinas > 0 || perimetroAberturas > 0) {
    const claveEsquinero = recipe.humedad ? 'R500129' : 'R800479';
    const esquinero = cat.find(p => p && p.clave === claveEsquinero);
    if (esquinero) finalProducts.push({ product: esquinero, factor: 1 });
  }

  if (recipe.permitir_aislamiento && aislamiento) {
    const aislamientoProd = cat.find(p => p.clave === 'R512831');
    if (aislamientoProd) finalProducts.push({ product: aislamientoProd, factor: 1 });
  }

  // ===== SIKAWALL POR CARA =====
  let totalBultosSika = 0;

  const agregarSika = (clave, area, cantidadCaras) => {
    const prod = cat.find(p => p.clave === clave);
    if (prod) {
      const qty = Math.ceil(area * cantidadCaras * 1.1 / 9);
      const existente = finalProducts.find(p => p.product.clave === clave);
      if (existente) {
        existente.customQuantity += qty;
      } else {
        finalProducts.push({ product: prod, factor: 1, customQuantity: qty, customUnit: 'pieza' });
      }
      totalBultosSika += qty;
    }
  };

  if (incluirResistenteA && selectedPanelA) {
    const claveA = selectedPanelA === 'R804171' ? 'S804720SC' : 'S804601SC';
    agregarSika(claveA, areaNeta, 1);
  }
  if (factorCaras >= 2 && incluirResistenteB && selectedPanelB) {
    const claveB = selectedPanelB === 'R804171' ? 'S804720SC' : 'S804601SC';
    agregarSika(claveB, areaNeta, 1);
  }

  // Sikalatex
  if (totalBultosSika > 0 && adherencia) {
    const litrosMezcla = totalBultosSika * 0.2;
    const carasConSika = (incluirResistenteA ? 1 : 0) + (factorCaras >= 2 && incluirResistenteB ? 1 : 0);
    const litrosLechada = (areaNeta * Math.max(carasConSika, 1)) / 20; // al menos 1 si hay SikaWall
    const litrosNecesarios = Math.ceil((litrosMezcla + litrosLechada) * 1.1 * 10) / 10;

    const presentaciones = cat.filter(p => p && p.tipo === 'sikalatex_presentacion');
    if (presentaciones.length > 0) {
      const ordenadas = [...presentaciones].sort((a, b) => (b.litros || 0) - (a.litros || 0));
      const combinacion = [];
      let restante = litrosNecesarios;
      for (const p of ordenadas) {
        if (restante <= 0) break;
        const cant = Math.floor(restante / (p.litros || 1));
        if (cant > 0) {
          combinacion.push({ product: p, quantity: cant });
          restante -= cant * (p.litros || 1);
        } else if (restante > 0 && restante > (p.litros || 1) * 0.5) {
          combinacion.push({ product: p, quantity: 1 });
          restante = 0;
          break;
        }
      }
      if (restante > 0) {
        const menor = ordenadas[ordenadas.length - 1];
        if (menor && menor.litros) {
          const existente = combinacion.find(c => c.product.clave === menor.clave);
          if (existente) existente.quantity += Math.ceil(restante / menor.litros);
          else combinacion.push({ product: menor, quantity: Math.ceil(restante / menor.litros) });
        }
      }
      for (const { product, quantity } of combinacion) {
        finalProducts.push({
          product: { ...product, descripcion: `SIKALATEX N ${product.litros}L` },
          factor: 1,
          customQuantity: quantity,
          customUnit: 'pza(s)',
        });
      }
    }
  }

  // ===== PANELES Y ACUMULADORES =====
  const panelA = selectedPanelA ? cat.find(p => p.clave === selectedPanelA) : null;
  const panelB = selectedPanelB ? cat.find(p => p.clave === selectedPanelB) : null;
  const faces = factorCaras || 1;

  const areaUnaCara = Math.ceil(areaNeta / 2.9768) * 1.1;
  const processedClaves = new Set();
  const tornillosAuto = new Set();
  const usarSeleccionPaneles = !!(selectedPanelA || selectedPanelB);

  let totalCintaPapel = 0;
  let totalCintaFibra = 0;
  let totalKgCompuesto = 0;
  let totalAreaProtekto = 0;
  let totalAreaUnireySeco = 0;

  function procesarPanel(panelClave, cantidadPaneles, esDobleCara, sikaActivo, baseLevel) {
    const product = cat.find(p => p.clave === panelClave);
    if (!product) return;
    finalProducts.push({ product, factor: 1, customQuantity: cantidadPaneles, customUnit: 'pza(s)' });
    processedClaves.add(panelClave);

    const tornilloClave = getTornilloPanelClave(panelClave, calibre);
    const tornillo = cat.find(p => p.clave === tornilloClave);
    if (tornillo) {
      const tasa = panelClave === 'R500077' ? 20 : 17;
      const areaParaTornillo = esDobleCara ? areaNeta * 2 : areaNeta;
      const qtyTornillo = Math.ceil(areaParaTornillo * tasa * 1.1);
      const existente = finalProducts.find(p => p.product.clave === tornilloClave);
      if (existente) existente.customQuantity += qtyTornillo;
      else finalProducts.push({ product: tornillo, factor: 1, customQuantity: qtyTornillo, customUnit: 'pza(s)' });
      tornillosAuto.add(tornilloClave);
    }

    const nivelEfectivo = sikaActivo ? 0.2 : baseLevel;

    if (esPanelEspecial(panelClave)) {
      totalCintaFibra += areaNeta * (esDobleCara ? 2 : 1);
      if (esProtekto(panelClave)) {
        if (sikaActivo) {
          totalKgCompuesto += cantidadPaneles * 0.5;
        } else {
          totalAreaProtekto += areaNeta * (esDobleCara ? 2 : 1);
        }
      } else {
        totalAreaUnireySeco += areaNeta * (esDobleCara ? 2 : 1);
      }
    } else {
      totalCintaPapel += areaNeta * (esDobleCara ? 2 : 1);
      totalKgCompuesto += areaNeta * (esDobleCara ? 2 : 1) * nivelEfectivo;
    }
  }

  if (panelA && faces >= 1) {
    const mismaCara = (faces >= 2 && panelB && panelB.clave === panelA.clave);
    let cantidad = Math.ceil(areaUnaCara);
    if (mismaCara) cantidad *= 2;
    procesarPanel(panelA.clave, cantidad, mismaCara, incluirResistenteA, nivelCompuestoA);
  }

  if (faces >= 2 && panelB && panelB.clave !== panelA?.clave) {
    procesarPanel(panelB.clave, Math.ceil(areaUnaCara), false, incluirResistenteB, nivelCompuestoB);
  }

  if (totalCintaPapel > 0) {
    const cinta = cat.find(p => p.clave === 'R800195');
    if (cinta) finalProducts.push({ product: cinta, factor: 1, customQuantity: Math.ceil(totalCintaPapel * 2.5 / 76.25), customUnit: 'pieza' });
  }
  if (totalCintaFibra > 0) {
    const cinta = cat.find(p => p.clave === 'R500081');
    if (cinta) finalProducts.push({ product: cinta, factor: 1, customQuantity: Math.ceil(totalCintaFibra * 2.5 / 46), customUnit: 'pieza' });
  }

  if (totalAreaProtekto > 0) {
    const qty = Math.ceil(totalAreaProtekto * 1.1 / 8);
    const protekto = cat.find(p => p.clave === 'R810709');
    if (protekto) finalProducts.push({ product: protekto, factor: 1, customQuantity: qty, customUnit: 'pieza' });
  }

  if (totalAreaUnireySeco > 0) {
    const qty = Math.ceil(totalAreaUnireySeco * 1.1 / 6);
    const unirey = cat.find(p => p.clave === 'R808279');
    if (unirey) finalProducts.push({ product: unirey, factor: 1, customQuantity: qty, customUnit: 'pieza' });
  }

  if (totalKgCompuesto > 0) {
    const kgNecesarios = Math.ceil(totalKgCompuesto * 10) / 10;
    const usarRapido = recipe.permitir_secado_rapido && secadoRapido;
    let compuestosDisponibles = cat.filter(p => p && p.tipo === 'compuesto' && !!p.rapido === usarRapido);
    if (compuestosDisponibles.length === 0) {
      compuestosDisponibles = cat.filter(p => p && p.tipo === 'compuesto' && !p.rapido);
    }
    if (compuestosDisponibles.length === 0) {
      compuestosDisponibles = cat.filter(p => p && p.tipo === 'compuesto');
    }
    const combinacion = combinarCompuestos(kgNecesarios, compuestosDisponibles);
    for (const { product, quantity } of combinacion) {
      finalProducts.push({ product, factor: 1, customQuantity: quantity, customUnit: 'pieza' });
    }
  }

  // ===== PINTURA =====
  if (recipe.permitir_pintura && incluirPintura && pinturaSeleccionada && superficie) {
    const rendimientoPintura = {
      'O1595': { lisa: 13, rugosa: 5.5 },
      'O1121': { lisa: 8, rugosa: 4 },
      'O1021': { lisa: 6, rugosa: 4 },
      'O1360': { lisa: 12, rugosa: 6 },
      'O1821': { lisa: 13, rugosa: 6.5 },
    };
    const rend = rendimientoPintura[pinturaSeleccionada]?.[superficie];
    if (rend) {
      const areaAPintar = areaNeta * (factorCaras || 1);
      const litrosNecesarios = Math.ceil(areaAPintar / rend * 1.1 * 10) / 10;
      const presentaciones = cat.filter(p => p && p.tipo === 'pintura_presentacion' && p.presentacion_de === pinturaSeleccionada);
      if (presentaciones.length > 0) {
        const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
        const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
        for (const { product, quantity } of combinacion) {
          const pinturaBase = cat.find(p => p.clave === product.presentacion_de);
          const nombreBase = pinturaBase?.desc || pinturaBase?.descripcion || product.descripcion || '';
          const descripcionCorta = `${nombreBase} ${product.litros}L`;
          finalProducts.push({
            product: { ...product, descripcion: descripcionCorta },
            factor: 1,
            customQuantity: quantity,
            customUnit: 'pza(s)'
          });
        }
      }
    }
  }

  // ===== SELLADOR =====
  if (recipe.permitir_pintura && incluirPintura && superficie === 'lisa' && selladorSeleccionado) {
    const rendimientoSellador = 35;
    const areaAPintar = areaNeta * (factorCaras || 1);
    const litrosNecesarios = Math.ceil(areaAPintar / rendimientoSellador * 1.1 * 10) / 10;

    const presentaciones = cat.filter(p => p && p.tipo === 'sellador_presentacion' && p.presentacion_de === selladorSeleccionado);
    if (presentaciones.length > 0) {
      const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
      const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
      for (const { product, quantity } of combinacion) {
        const selladorBase = cat.find(p => p.clave === product.presentacion_de);
        const nombreBase = selladorBase?.desc || selladorBase?.descripcion || product.descripcion || '';
        const descripcionCorta = `${nombreBase} ${product.litros}L`;
        finalProducts.push({
          product: { ...product, descripcion: descripcionCorta },
          factor: 1,
          customQuantity: quantity,
          customUnit: 'pza(s)',
        });
      }
    }
  }

  // ===== SELLADO PERIMETRAL =====
  if (incluirSellado) {
    let perimetroTotal = 2 * (largo + alto);
    for (const p of puertas) {
      perimetroTotal += 2 * (p.ancho || 0.9) + 2 * (p.alto || 2.1);
    }
    for (const v of ventanas) {
      perimetroTotal += 2 * (v.ancho || 1.2) + 2 * (v.alto || 1.0);
    }
    const cartuchos = Math.ceil(perimetroTotal / 12);

    const algunPanelEspecial = ['R803499','R500077','R800495'].includes(selectedPanelA) ||
                              ['R803499','R500077','R800495'].includes(selectedPanelB);
    const claveSellador = (recipe.humedad || algunPanelEspecial) ? 'S496564CA' : 'S451874CA';
    const sellador = cat.find(p => p.clave === claveSellador);
    if (sellador) {
      finalProducts.push({
        product: sellador,
        factor: 1,
        customQuantity: cartuchos,
        customUnit: 'pza(s)'
      });
    }
  }

  // ===== RESTO DE PRODUCTOS DE LA RECETA =====
  for (const item of recipe.productos) {
    const product = cat.find(p => p && p.clave === item.clave);
    if (!product) continue;
    if (usarSeleccionPaneles && product.tipo === 'panel') continue;
    if (tornillosAuto.has(product.clave)) continue;
    if (['R800195', 'R500081', 'R808279'].includes(product.clave) && usarSeleccionPaneles) continue;
    if (product.tipo === 'compuesto' && usarSeleccionPaneles) continue;
    if (usarSeleccionPaneles && product.tipo === 'tornillo') continue;
    if (product.tipo === 'poste' && anchoPerfil) continue;
    if (product.tipo === 'canal' && anchoPerfil) continue;
    if (product.tipo === 'esquinero') continue;
    if (product.tipo === 'tornillo_framer') continue;
    if (product.tipo === 'aislamiento') continue;
    if (product.tipo === 'reborde') continue;
    finalProducts.push({ product, factor: item.factor || 1 });
  }

  const results = [];
  for (const { product, factor, customQuantity, customUnit } of finalProducts) {
    let quantity;
    try {
      quantity = customQuantity !== undefined ? customQuantity : safeEval(product.formula, context);
    } catch (e) {
      console.error(`Error en fórmula de ${product.clave}:`, e);
      quantity = 0;
    }
    if (customQuantity === undefined) quantity = Math.ceil(quantity * (factor || 1));
    results.push({ product, quantity, unit: customUnit || product.unidad });
  }

  return results;
}

// ==================== PLAFÓN CORRIDO ====================
export function calculatePlafon(params, catalog) {
  const {
    largo, ancho, alturaPleno,
    separacionListones,
    nivelCompuestoKg = 0.75,
    secadoRapido = false,
    selectedPanel,
    humedad = false,
    permitirAislamiento = false,
    aislamiento = false,
    permitirResistente = false,
    incluirResistente = false,
    adherencia = false,
    permitirPintura = false,
    incluirPintura = false,
    pinturaSeleccionada,
    superficie,
    selladorSeleccionado,
    incluirSellado = false,
  } = params;

  const areaPlafon = largo * ancho;
  const perimetro = 2 * (largo + ancho);
  const separacionCarga = 1.22;
  const canalesCarga = Math.ceil(largo / separacionCarga) + 1;
  const canalesListon = Math.ceil(ancho / separacionListones) + 1;
  const intersecciones = canalesCarga * canalesListon;

  const finalProducts = [];

  // Ángulo de amarre
  const angulo = catalog.find(p => p.clave === 'R800475');
  if (angulo) finalProducts.push({ product: angulo, customQuantity: Math.ceil(perimetro / 3.05), customUnit: 'pza(s)' });

  // Canaleta de carga
  const canalCarga = catalog.find(p => p.clave === 'R800386');
  if (canalCarga) {
    const largoTotalCarga = canalesCarga * ancho;
    finalProducts.push({ product: canalCarga, customQuantity: Math.ceil(largoTotalCarga / 3.05), customUnit: 'pza(s)' });
  }

  // Canal listón
  const canalListon = catalog.find(p => p.clave === 'R800472');
  if (canalListon) {
    const largoTotalListon = canalesListon * largo;
    finalProducts.push({ product: canalListon, customQuantity: Math.ceil(largoTotalListon / 3.05), customUnit: 'pza(s)' });
  }

  // Alambre (kg)
  const alambre = catalog.find(p => p.clave === 'T44466');
  if (alambre && alturaPleno) {
    const metrosAlambre = intersecciones * alturaPleno;
    const kgNecesarios = Math.ceil(metrosAlambre / 43);
    finalProducts.push({ product: alambre, customQuantity: kgNecesarios, customUnit: 'kg' });
  }

  // Tornillos framer
  const tornilloFramer = catalog.find(p => p.clave === 'R500259');
  if (tornilloFramer) {
    const qtyFramer = intersecciones * 2 + canalesListon * 2;
    finalProducts.push({ product: tornilloFramer, customQuantity: qtyFramer, customUnit: 'pza(s)' });
  }

  // Taquetes
  const taquete = catalog.find(p => p.clave === 'D026');
  if (taquete) {
    finalProducts.push({ product: taquete, customQuantity: Math.ceil(perimetro * 1.6), customUnit: 'pza(s)' });
  }

  // Pijas para taquetes (1 por taquete, bolsas de 100 piezas)
  const cantidadTaquetesPlafon = Math.ceil(perimetro * 1.6);
  const pijaPlafon = catalog.find(p => p.clave === 'T44347');
  if (pijaPlafon) {
    finalProducts.push({ product: pijaPlafon, customQuantity: Math.ceil(cantidadTaquetesPlafon / 100), customUnit: 'bolsa(s)' });
  }

  // Aislamiento
  if (permitirAislamiento && aislamiento) {
    const aislamientoProd = catalog.find(p => p.clave === 'R512831');
    if (aislamientoProd) {
      const rollos = Math.ceil((areaPlafon / 9.15) * 1.1);
      finalProducts.push({ product: aislamientoProd, customQuantity: rollos, customUnit: 'pieza' });
    }
  }

  // SikaWall
  if (permitirResistente && incluirResistente) {
    const resistenteClave = selectedPanel === 'R804171' ? 'S804720SC' : 'S804601SC';
    const resistenteProd = catalog.find(p => p.clave === resistenteClave);
    if (resistenteProd) {
      const qty = Math.ceil(areaPlafon * 1.1 / 9);
      finalProducts.push({ product: resistenteProd, customQuantity: qty, customUnit: 'pieza' });
    }

    // Sikalatex
    if (adherencia) {
      const bultosSika = Math.ceil(areaPlafon * 1.1 / 9);
      const litrosMezcla = bultosSika * 0.2;
      const litrosLechada = areaPlafon / 20;
      const litrosNecesarios = Math.ceil((litrosMezcla + litrosLechada) * 1.1 * 10) / 10;

      const presentaciones = catalog.filter(p => p && p.tipo === 'sikalatex_presentacion');
      if (presentaciones.length > 0) {
        const ordenadas = [...presentaciones].sort((a, b) => (b.litros || 0) - (a.litros || 0));
        const combinacion = [];
        let restante = litrosNecesarios;
        for (const p of ordenadas) {
          if (restante <= 0) break;
          const cant = Math.floor(restante / (p.litros || 1));
          if (cant > 0) {
            combinacion.push({ product: p, quantity: cant });
            restante -= cant * (p.litros || 1);
          } else if (restante > 0 && restante > (p.litros || 1) * 0.5) {
            combinacion.push({ product: p, quantity: 1 });
            restante = 0;
            break;
          }
        }
        if (restante > 0) {
          const menor = ordenadas[ordenadas.length - 1];
          if (menor && menor.litros) {
            const existente = combinacion.find(c => c.product.clave === menor.clave);
            if (existente) existente.quantity += Math.ceil(restante / menor.litros);
            else combinacion.push({ product: menor, quantity: Math.ceil(restante / menor.litros) });
          }
        }
        for (const { product, quantity } of combinacion) {
          finalProducts.push({
            product: { ...product, descripcion: `SIKALATEX N ${product.litros}L` },
            factor: 1,
            customQuantity: quantity,
            customUnit: 'pza(s)',
          });
        }
      }
    }
  }

  // Paneles y sus materiales
  const panel = catalog.find(p => p.clave === selectedPanel);
  if (panel) {
    const esEspecial = ['R807609', 'R800495', 'R803499', 'R500077'].includes(selectedPanel);
    const cantidadPaneles = Math.ceil((areaPlafon / 2.9768) * 1.1);
    finalProducts.push({ product: panel, customQuantity: cantidadPaneles, customUnit: 'pza(s)' });

    const tornilloClave = selectedPanel === 'R500077' ? 'R500231' :
                         esEspecial ? 'R500239' : 'R522020';
    const tornillo = catalog.find(p => p.clave === tornilloClave);
    if (tornillo) {
      const tasaTornillos = selectedPanel === 'R500077' ? 20 : 17;
      const qtyTornillo = Math.ceil(areaPlafon * tasaTornillos * 1.1);
      finalProducts.push({ product: tornillo, customQuantity: qtyTornillo, customUnit: 'pza(s)' });
    }

    if (esEspecial) {
      const cintaFibra = catalog.find(p => p.clave === 'R500081');
      if (cintaFibra) {
        const rollos = Math.ceil(areaPlafon * 2.7 * 1.1 / 46);
        finalProducts.push({ product: cintaFibra, customQuantity: rollos, customUnit: 'pieza' });
      }

      if (esProtekto(selectedPanel)) {
        const qtyProtekto = Math.ceil(areaPlafon * 1.1 / 8);
        const protekto = catalog.find(p => p.clave === 'R810709');
        if (protekto) finalProducts.push({ product: protekto, customQuantity: qtyProtekto, customUnit: 'pieza' });
      } else {
        const qtyBaseCoat = Math.ceil(areaPlafon * 1.1 / 6);
        const baseCoatClave = 'R808279';
        const baseCoat = catalog.find(p => p.clave === baseCoatClave);
        if (baseCoat) finalProducts.push({ product: baseCoat, customQuantity: qtyBaseCoat, customUnit: 'pieza' });
      }
    } else {
      const cintaPapel = catalog.find(p => p.clave === 'R800195');
      if (cintaPapel) {
        const rollos = Math.ceil(areaPlafon * 2.7 * 1.1 / 76.25);
        finalProducts.push({ product: cintaPapel, customQuantity: rollos, customUnit: 'pieza' });
      }

      const kgNecesarios = areaPlafon * (incluirResistente ? 0.2 : nivelCompuestoKg);
      const compuestosDisponibles = catalog.filter(p => p && p.tipo === 'compuesto' && !!p.rapido === secadoRapido);
      if (compuestosDisponibles.length === 0) {
        compuestosDisponibles = catalog.filter(p => p && p.tipo === 'compuesto' && !p.rapido);
      }
      if (compuestosDisponibles.length === 0) {
        compuestosDisponibles = catalog.filter(p => p && p.tipo === 'compuesto');
      }
      if (compuestosDisponibles.length > 0 && kgNecesarios > 0) {
        const presentacionesAdaptadas = compuestosDisponibles.map(p => ({ ...p, kg: p.kg }));
        const combinacion = combinarCompuestos(kgNecesarios, presentacionesAdaptadas);
        for (const { product, quantity } of combinacion) {
          finalProducts.push({ product, factor: 1, customQuantity: quantity, customUnit: 'pieza' });
        }
      }
    }
  }

  // ===== SELLADO PERIMETRAL =====
  if (incluirSellado) {
    const perimetroTotal = 2 * (largo + ancho);
    const cartuchos = Math.ceil(perimetroTotal / 12);

    const panelEspecial = ['R803499','R500077','R800495'].includes(selectedPanel);
    const claveSellador = (humedad || panelEspecial) ? 'S496564CA' : 'S451874CA';
    const sellador = catalog.find(p => p.clave === claveSellador);
    if (sellador) {
      finalProducts.push({
        product: sellador,
        factor: 1,
        customQuantity: cartuchos,
        customUnit: 'pza(s)'
      });
    }
  }

  // Pintura (plafón)
  if (permitirPintura && incluirPintura && pinturaSeleccionada && superficie) {
    const rendimientoPintura = {
      'O1595': { lisa: 13, rugosa: 5.5 },
      'O1121': { lisa: 8, rugosa: 4 },
      'O1021': { lisa: 6, rugosa: 4 },
      'O1360': { lisa: 12, rugosa: 6 },
      'O1821': { lisa: 13, rugosa: 6.5 },
    };
    const rend = rendimientoPintura[pinturaSeleccionada]?.[superficie];
    if (rend) {
      const litrosNecesarios = Math.ceil(areaPlafon / rend * 1.1 * 10) / 10;
      const presentaciones = catalog.filter(p => p.tipo === 'pintura_presentacion' && p.presentacion_de === pinturaSeleccionada);
      if (presentaciones.length > 0) {
        const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
        const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
        for (const { product, quantity } of combinacion) {
          const pinturaBase = catalog.find(p => p.clave === product.presentacion_de);
          const nombreBase = pinturaBase?.desc || pinturaBase?.descripcion || product.descripcion || '';
          const descripcionCorta = `${nombreBase} ${product.litros}L`;
          finalProducts.push({
            product: { ...product, descripcion: descripcionCorta },
            factor: 1,
            customQuantity: quantity,
            customUnit: 'pza(s)'
          });
        }
      }
    }
  }

  // Sellador (plafón)
  if (permitirPintura && incluirPintura && superficie === 'lisa' && selladorSeleccionado) {
    const rendimientoSellador = 35;
    const litrosNecesarios = Math.ceil(areaPlafon / rendimientoSellador * 1.1 * 10) / 10;
    const presentaciones = catalog.filter(p => p.tipo === 'sellador_presentacion' && p.presentacion_de === selladorSeleccionado);
    if (presentaciones.length > 0) {
      const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
      const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
      for (const { product, quantity } of combinacion) {
        const selladorBase = catalog.find(p => p.clave === product.presentacion_de);
        const nombreBase = selladorBase?.desc || selladorBase?.descripcion || product.descripcion || '';
        const descripcionCorta = `${nombreBase} ${product.litros}L`;
        finalProducts.push({
          product: { ...product, descripcion: descripcionCorta },
          factor: 1,
          customQuantity: quantity,
          customUnit: 'pza(s)',
        });
      }
    }
  }

  return finalProducts.map(({ product, customQuantity, customUnit }) => ({
    product,
    quantity: customQuantity,
    unit: customUnit || product.unidad,
  }));
}

// ==================== MURO EXTERIOR ====================
export function calculateMuroExterior(params, catalog) {
  const {
    largo, alto, esquinas = 0,
    puertas = [], ventanas = [],
    separacionPostes,
    anchoPerfil = '6.35',
    nivelCompuestoExterior = 0.75,
    nivelCompuestoInterior = 0.75,
    secadoRapido = false,
    aislamiento = false,
    refuerzos = false,
    selectedPanelExterior,
    contrafachada = false,
    selectedPanelInterior,
    incluirPintura = false,
    pinturaSeleccionada,
    superficie,
    selladorSeleccionado,
    incluirResistenteExterior = false,
    incluirResistenteInterior = false,
    adherencia = false,
    permitirAislamiento = true,
    permitirRefuerzos = true,
    permitirResistente = true,
    permitirPintura = true,
    humedad = false,
    incluirSellado = false,
  } = params;

  const calibre = 20;

  // ===== CÁLCULO DE POSTES =====
  const postesMuro = Math.ceil(largo / separacionPostes) + 1;
  const largoPoste = alto <= 2.44 ? 2.44 : 3.05;

  let postesAberturas = 0;
  for (const p of puertas) postesAberturas += Math.ceil((p.alto || 2.1) * 2 / largoPoste);
  for (const v of ventanas) postesAberturas += Math.ceil((v.alto || 1.0) * 2 / largoPoste);
  let totalPostes = postesMuro + esquinas + postesAberturas;

  if (alto > 3.05) {
    const tramoRestante = alto - 3.05;
    const desperdicio = 1.10;
    const metrosExtras = totalPostes * tramoRestante * desperdicio;
    const postesExtras = Math.ceil(metrosExtras / 3.05);
    totalPostes += postesExtras;
  }

  // ===== ÁREAS =====
  const areaMuro = largo * alto;
  const areaPuertas = puertas.reduce((s, p) => s + (p.ancho || 0.9) * (p.alto || 2.1), 0);
  const areaVentanas = ventanas.reduce((s, v) => s + (v.ancho || 1.2) * (v.alto || 1.0), 0);
  const areaNeta = Math.max(0, areaMuro - areaPuertas - areaVentanas);
  const areaExterior = areaNeta;
  const totalLargoCabezales = puertas.reduce((s, p) => s + (p.ancho || 0.9) + 0.2, 0) +
                              ventanas.reduce((s, v) => s + (v.ancho || 1.2) * 2, 0);
  const sumaAnchoPuertas = puertas.reduce((s, p) => s + (p.ancho || 0.9), 0);

  let perimetroAberturas = 0;
  for (const p of puertas) perimetroAberturas += (p.alto || 2.1) * 2 + (p.ancho || 0.9);
  for (const v of ventanas) perimetroAberturas += (v.alto || 1.0) * 2 + (v.ancho || 1.2) * 2;

  const espacios = Math.ceil(largo / separacionPostes);
  const sumaAnchoAberturas = sumaAnchoPuertas + ventanas.reduce((s, v) => s + (v.ancho || 1.2), 0);
  const huecosAberturas = sumaAnchoAberturas > 0 ? Math.ceil(sumaAnchoAberturas / separacionPostes) : 0;
  const huecosEfectivos = Math.max(0, espacios - huecosAberturas);
  const totalTramos = huecosEfectivos > 0
    ? ((huecosEfectivos % 2 === 0) ? 1.5 * huecosEfectivos : 1.5 * huecosEfectivos - 0.5)
    : 0;
  const metrosRefuerzo = (permitirRefuerzos && refuerzos) ? totalTramos * separacionPostes : 0;
  const extraFramer = (permitirRefuerzos && refuerzos) ? totalTramos * 4 : 0;

  const finalProducts = [];

  function findPosteCal20(ancho, alto, cat) {
    const anchoNum = parseFloat(ancho);
    const largoDeseado = alto <= 2.44 ? 2.44 : 3.05;
    let poste = cat.find(p => p && p.tipo === 'poste' && p.calibre === 20 && Math.abs(p.ancho - anchoNum) < 0.01 && p.largo === largoDeseado);
    if (poste) return poste;
    return cat.find(p => p && p.tipo === 'poste' && p.calibre === 20 && Math.abs(p.ancho - anchoNum) < 0.01) || null;
  }

  function findCanalCal20(ancho, cat) {
    const anchoNum = parseFloat(ancho);
    let canal = cat.find(p => p && p.tipo === 'canal' && p.calibre === 20 && Math.abs(p.ancho - anchoNum) < 0.01);
    if (canal) return canal;
    return cat.find(p => p && p.tipo === 'canal' && Math.abs(p.ancho - anchoNum) < 0.01) || null;
  }

  // Poste
  const autoPoste = findPosteCal20(anchoPerfil, alto, catalog);
  if (autoPoste) finalProducts.push({ product: autoPoste, factor: 1, customQuantity: totalPostes, customUnit: 'pza(s)' });

  // Canal
  const autoCanal = findCanalCal20(anchoPerfil, catalog);
  if (autoCanal) finalProducts.push({ product: autoCanal, factor: 1 });

  // Tornillo framer
  const framerClave = 'R500242';
  const tornilloFramer = catalog.find(p => p.clave === framerClave);
  if (tornilloFramer) {
    const qtyFramer = Math.ceil((totalPostes * 5 + (puertas.length + ventanas.length) * 2 + extraFramer) * 1.1);
    finalProducts.push({ product: tornilloFramer, factor: 1, customQuantity: qtyFramer, customUnit: 'pza(s)' });
  }

  // Reborde J
  const rebordeClave = humedad ? 'R801675' : 'R800474';
  const rebordeJ = catalog.find(p => p.clave === rebordeClave);
  if (rebordeJ) {
    const largoEfectivo = Math.max(0, largo - sumaAnchoPuertas);
    const qtyReborde = Math.ceil(largoEfectivo / 3);
    finalProducts.push({ product: rebordeJ, factor: 1, customQuantity: qtyReborde, customUnit: 'pza(s)' });
  }

  // Taquetes y pijas para fijar canales (10 taquetes por pieza de canal)
  const largoEfectivoTaquetes = Math.max(0, largo - sumaAnchoPuertas);
  const totalCanalPieces = Math.ceil((2 * largoEfectivoTaquetes) / 3.05);
  const cantidadTaquetes = totalCanalPieces * 10;
  const taquete = catalog.find(p => p.clave === 'D026');
  if (taquete) {
    finalProducts.push({ product: taquete, factor: 1, customQuantity: cantidadTaquetes, customUnit: 'pza(s)' });
  }
  const pija = catalog.find(p => p.clave === 'T44347');
  if (pija) {
    finalProducts.push({ product: pija, factor: 1, customQuantity: Math.ceil(cantidadTaquetes / 100), customUnit: 'bolsa(s)' });
  }

  // Esquinero
  if (esquinas > 0 || perimetroAberturas > 0) {
    const claveEsquinero = humedad ? 'R500129' : 'R800479';
    const esquinero = catalog.find(p => p && p.clave === claveEsquinero);
    if (esquinero) finalProducts.push({ product: esquinero, factor: 1 });
  }

  // Aislamiento
  if (permitirAislamiento && aislamiento) {
    const aislamientoProd = catalog.find(p => p.clave === 'R512831');
    if (aislamientoProd) {
      const cantidad = Math.ceil(((Math.ceil(largo / separacionPostes) - 1) * separacionPostes * alto) / 9.15 * 1.1);
      finalProducts.push({ product: aislamientoProd, factor: 1, customQuantity: cantidad, customUnit: 'pieza' });
    }
  }

  // ===== SIKAWALL POR CARA =====
  let totalBultosSika = 0;

  const agregarSikaExterior = (clave, area) => {
    const prod = catalog.find(p => p.clave === clave);
    if (prod) {
      const qty = Math.ceil(area * 1.1 / 9);
      const existente = finalProducts.find(p => p.product.clave === clave);
      if (existente) {
        existente.customQuantity += qty;
      } else {
        finalProducts.push({ product: prod, factor: 1, customQuantity: qty, customUnit: 'pieza' });
      }
      totalBultosSika += qty;
    }
  };

  if (incluirResistenteExterior) {
    agregarSikaExterior('S804601SC', areaExterior);
  }

  if (contrafachada && selectedPanelInterior && incluirResistenteInterior) {
    const clave = selectedPanelInterior === 'R804171' ? 'S804720SC' : 'S804601SC';
    agregarSikaExterior(clave, areaExterior);
  }

  // Sikalatex
  if (totalBultosSika > 0 && adherencia) {
    const litrosMezcla = totalBultosSika * 0.2;
    const factorCaras = contrafachada ? 2 : 1;
    const carasConSika = (incluirResistenteExterior ? 1 : 0) + (contrafachada && incluirResistenteInterior ? 1 : 0);
    const litrosLechada = (areaExterior * Math.max(carasConSika, 1)) / 20;
    const litrosNecesarios = Math.ceil((litrosMezcla + litrosLechada) * 1.1 * 10) / 10;

    const presentaciones = catalog.filter(p => p && p.tipo === 'sikalatex_presentacion');
    if (presentaciones.length > 0) {
      const ordenadas = [...presentaciones].sort((a, b) => (b.litros || 0) - (a.litros || 0));
      const combinacion = [];
      let restante = litrosNecesarios;
      for (const p of ordenadas) {
        if (restante <= 0) break;
        const cant = Math.floor(restante / (p.litros || 1));
        if (cant > 0) { combinacion.push({ product: p, quantity: cant }); restante -= cant * (p.litros || 1); }
        else if (restante > 0 && restante > (p.litros || 1) * 0.5) { combinacion.push({ product: p, quantity: 1 }); restante = 0; break; }
      }
      if (restante > 0) {
        const menor = ordenadas[ordenadas.length - 1];
        if (menor && menor.litros) {
          const existente = combinacion.find(c => c.product.clave === menor.clave);
          if (existente) existente.quantity += Math.ceil(restante / menor.litros);
          else combinacion.push({ product: menor, quantity: Math.ceil(restante / menor.litros) });
        }
      }
      for (const { product, quantity } of combinacion) {
        finalProducts.push({
          product: { ...product, descripcion: `SIKALATEX N ${product.litros}L` },
          factor: 1,
          customQuantity: quantity,
          customUnit: 'pza(s)',
        });
      }
    }
  }

  // ===== PANELES Y ACUMULADORES =====
  let totalCintaFibra = 0;
  let totalCintaPapel = 0;
  let totalAreaProtekto = 0;
  let totalAreaUnirey = 0;
  let totalKgCompuesto = 0;

  const areaUnaCara = Math.ceil((areaExterior / 2.9768) * 1.1);

  function agregarPanelYTornillos(panelClave, cantidad, esDobleCara) {
    const product = catalog.find(p => p.clave === panelClave);
    if (!product) return;
    finalProducts.push({ product, factor: 1, customQuantity: cantidad, customUnit: 'pza(s)' });

    const tornilloClave = getTornilloPanelClave(panelClave, calibre);
    const tornillo = catalog.find(p => p.clave === tornilloClave);
    if (tornillo) {
      const tasa = panelClave === 'R500077' ? 20 : 17;
      const areaParaTornillo = esDobleCara ? areaExterior * 2 : areaExterior;
      const qtyTornillo = Math.ceil(areaParaTornillo * tasa * 1.1);
      const existente = finalProducts.find(p => p.product.clave === tornilloClave);
      if (existente) existente.customQuantity += qtyTornillo;
      else finalProducts.push({ product: tornillo, factor: 1, customQuantity: qtyTornillo, customUnit: 'pza(s)' });
    }
  }

  // Procesar panel exterior
  agregarPanelYTornillos(selectedPanelExterior, areaUnaCara, false);
  if (esPanelEspecial(selectedPanelExterior)) {
    totalCintaFibra += areaExterior;
    if (esProtekto(selectedPanelExterior)) {
      if (incluirResistenteExterior) {
        totalKgCompuesto += areaUnaCara * 0.5;
      } else {
        totalAreaProtekto += areaExterior;
      }
    } else {
      totalAreaUnirey += areaExterior;
    }
  } else {
    totalCintaPapel += areaExterior;
    totalKgCompuesto += areaExterior * (incluirResistenteExterior ? 0.2 : nivelCompuestoExterior);
  }

  // Contrafachada
  if (contrafachada && selectedPanelInterior) {
    agregarPanelYTornillos(selectedPanelInterior, areaUnaCara, false);
    if (esPanelEspecial(selectedPanelInterior)) {
      totalCintaFibra += areaExterior;
      if (esProtekto(selectedPanelInterior)) {
        if (incluirResistenteInterior) {
          totalKgCompuesto += areaUnaCara * 0.5;
        } else {
          totalAreaProtekto += areaExterior;
        }
      } else {
        totalAreaUnirey += areaExterior;
      }
    } else {
      totalCintaPapel += areaExterior;
      totalKgCompuesto += areaExterior * (incluirResistenteInterior ? 0.2 : nivelCompuestoInterior);
    }
  }

  // Agregar cintas acumuladas
  if (totalCintaFibra > 0) {
    const cintaFibra = catalog.find(p => p.clave === 'R500081');
    if (cintaFibra) {
      finalProducts.push({ product: cintaFibra, factor: 1, customQuantity: Math.ceil(totalCintaFibra * 2.5 / 46), customUnit: 'pieza' });
    }
  }
  if (totalCintaPapel > 0) {
    const cintaPapel = catalog.find(p => p.clave === 'R800195');
    if (cintaPapel) {
      finalProducts.push({ product: cintaPapel, factor: 1, customQuantity: Math.ceil(totalCintaPapel * 2.5 / 76.25), customUnit: 'pieza' });
    }
  }

  // Protekto acumulado
  if (totalAreaProtekto > 0) {
    const qty = Math.ceil(totalAreaProtekto * 1.1 / 8);
    const protekto = catalog.find(p => p.clave === 'R810709');
    if (protekto) finalProducts.push({ product: protekto, factor: 1, customQuantity: qty, customUnit: 'pieza' });
  }

  // Unirey (siempre seco R808279)
  if (totalAreaUnirey > 0) {
    const qty = Math.ceil(totalAreaUnirey * 1.1 / 6);
    const unirey = catalog.find(p => p.clave === 'R808279');
    if (unirey) finalProducts.push({ product: unirey, factor: 1, customQuantity: qty, customUnit: 'pieza' });
  }

  // Compuesto normal
  if (totalKgCompuesto > 0) {
    const kgNecesarios = Math.ceil(totalKgCompuesto * 10) / 10;
    let compuestosDisponibles = catalog.filter(p => p && p.tipo === 'compuesto' && !!p.rapido === secadoRapido);
    if (compuestosDisponibles.length === 0) {
      compuestosDisponibles = catalog.filter(p => p && p.tipo === 'compuesto' && !p.rapido);
    }
    if (compuestosDisponibles.length === 0) {
      compuestosDisponibles = catalog.filter(p => p && p.tipo === 'compuesto');
    }
    if (compuestosDisponibles.length > 0) {
      const presentacionesAdaptadas = compuestosDisponibles.map(p => ({ ...p, kg: p.kg }));
      const combinacion = combinarCompuestos(kgNecesarios, presentacionesAdaptadas);
      for (const { product, quantity } of combinacion) {
        finalProducts.push({ product, factor: 1, customQuantity: quantity, customUnit: 'pieza' });
      }
    }
  }

  // ===== PINTURA Y SELLADOR =====
  if (permitirPintura && incluirPintura && pinturaSeleccionada && superficie) {
    const factorCaras = contrafachada ? 2 : 1;
    const areaAPintar = areaExterior * factorCaras;

    const rendimientoPintura = {
      'O1595': { lisa: 13, rugosa: 5.5 },
      'O1121': { lisa: 8, rugosa: 4 },
      'O1021': { lisa: 6, rugosa: 4 },
      'O1360': { lisa: 12, rugosa: 6 },
      'O1821': { lisa: 13, rugosa: 6.5 },
    };
    const rend = rendimientoPintura[pinturaSeleccionada]?.[superficie];
    if (rend) {
      const litrosNecesarios = Math.ceil(areaAPintar / rend * 1.1 * 10) / 10;
      const presentaciones = catalog.filter(p => p.tipo === 'pintura_presentacion' && p.presentacion_de === pinturaSeleccionada);
      if (presentaciones.length > 0) {
        const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
        const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
        for (const { product, quantity } of combinacion) {
          const pinturaBase = catalog.find(p => p.clave === product.presentacion_de);
          const nombreBase = pinturaBase?.desc || pinturaBase?.descripcion || product.descripcion || '';
          const descripcionCorta = `${nombreBase} ${product.litros}L`;
          finalProducts.push({
            product: { ...product, descripcion: descripcionCorta },
            factor: 1,
            customQuantity: quantity,
            customUnit: 'pza(s)'
          });
        }
      }
    }

    if (superficie === 'lisa' && selladorSeleccionado) {
      const rendimientoSellador = 35;
      const litrosNecesarios = Math.ceil(areaAPintar / rendimientoSellador * 1.1 * 10) / 10;
      const presentaciones = catalog.filter(p => p.tipo === 'sellador_presentacion' && p.presentacion_de === selladorSeleccionado);
      if (presentaciones.length > 0) {
        const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
        const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
        for (const { product, quantity } of combinacion) {
          const selladorBase = catalog.find(p => p.clave === product.presentacion_de);
          const nombreBase = selladorBase?.desc || selladorBase?.descripcion || product.descripcion || '';
          const descripcionCorta = `${nombreBase} ${product.litros}L`;
          finalProducts.push({
            product: { ...product, descripcion: descripcionCorta },
            factor: 1,
            customQuantity: quantity,
            customUnit: 'pza(s)',
          });
        }
      }
    }
  }

  // ===== SELLADO PERIMETRAL =====
  if (incluirSellado) {
    let perimetroTotal = 2 * (largo + alto);
    for (const p of puertas) {
      perimetroTotal += 2 * (p.ancho || 0.9) + 2 * (p.alto || 2.1);
    }
    for (const v of ventanas) {
      perimetroTotal += 2 * (v.ancho || 1.2) + 2 * (v.alto || 1.0);
    }
    const cartuchos = Math.ceil(perimetroTotal / 12);

    const panelEspecial = ['R803499','R500077','R800495'].includes(selectedPanelExterior);
    const claveSellador = (humedad || panelEspecial) ? 'S496564CA' : 'S451874CA';
    const sellador = catalog.find(p => p.clave === claveSellador);
    if (sellador) {
      finalProducts.push({
        product: sellador,
        factor: 1,
        customQuantity: cartuchos,
        customUnit: 'pza(s)'
      });
    }
  }



  // Contexto para fórmulas
  const context = {
    largo, alto, esquinas, separacionPostes,
    areaMuro, areaNeta, areaTotalPanel: areaExterior,
    totalLargoCabezales,
    puertas: puertas.length, ventanas: ventanas.length,
    factorCaras: 1,
    anchoPerfil, calibre,
    sumaAnchoPuertas,
    metrosRefuerzo,
    extraFramer,
    perimetroAberturas,
    totalPostes,
  };

  const results = [];
  for (const { product, factor, customQuantity, customUnit } of finalProducts) {
    let quantity;
    try {
      quantity = customQuantity !== undefined ? customQuantity : safeEval(product.formula, context);
    } catch (e) {
      console.error(`Error en fórmula de ${product.clave}:`, e);
      quantity = 0;
    }
    if (customQuantity === undefined) quantity = Math.ceil(quantity * (factor || 1));
    results.push({ product, quantity, unit: customUnit || product.unidad });
  }

  return results;
}

// ==================== SOLO PINTURA ====================
export function calculatePintura(params, catalog) {
  const {
    largo, alto,
    factorCaras = 1,
    incluirSellador = false,
    pinturaSeleccionada,
    superficie,
    selladorSeleccionado,
  } = params;

  const areaNeta = largo * alto;
  const areaAPintar = areaNeta * factorCaras;

  const finalProducts = [];

  // Pintura
  if (pinturaSeleccionada && superficie) {
    const rendimientoPintura = {
      'O1595': { lisa: 13, rugosa: 5.5 },
      'O1121': { lisa: 8, rugosa: 4 },
      'O1021': { lisa: 6, rugosa: 4 },
      'O1360': { lisa: 12, rugosa: 6 },
      'O1821': { lisa: 13, rugosa: 6.5 },
    };
    const rend = rendimientoPintura[pinturaSeleccionada]?.[superficie];
    if (rend) {
      const litrosNecesarios = Math.ceil(areaAPintar / rend * 1.1 * 10) / 10;
      const presentaciones = catalog.filter(p => p.tipo === 'pintura_presentacion' && p.presentacion_de === pinturaSeleccionada);
      if (presentaciones.length > 0) {
        const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
        const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
        for (const { product, quantity } of combinacion) {
          const pinturaBase = catalog.find(p => p.clave === product.presentacion_de);
          const nombreBase = pinturaBase?.desc || pinturaBase?.descripcion || product.descripcion || '';
          const descripcionCorta = `${nombreBase} ${product.litros}L`;
          finalProducts.push({
            product: { ...product, descripcion: descripcionCorta },
            customQuantity: quantity,
            customUnit: 'pza(s)'
          });
        }
      }
    }
  }

  // Sellador
  if (incluirSellador && selladorSeleccionado) {
    const rendimientoSellador = 35;
    const litrosNecesarios = Math.ceil(areaAPintar / rendimientoSellador * 1.1 * 10) / 10;
    const presentaciones = catalog.filter(p => p.tipo === 'sellador_presentacion' && p.presentacion_de === selladorSeleccionado);
    if (presentaciones.length > 0) {
      const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
      const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
      for (const { product, quantity } of combinacion) {
        const selladorBase = catalog.find(p => p.clave === product.presentacion_de);
        const nombreBase = selladorBase?.desc || selladorBase?.descripcion || product.descripcion || '';
        const descripcionCorta = `${nombreBase} ${product.litros}L`;
        finalProducts.push({
          product: { ...product, descripcion: descripcionCorta },
          customQuantity: quantity,
          customUnit: 'pza(s)'
        });
      }
    }
  }

  return finalProducts.map(({ product, customQuantity, customUnit }) => ({
    product,
    quantity: customQuantity,
    unit: customUnit || product.unidad,
  }));
}

// ==================== IMPERMEABILIZANTE ====================
export function calculateImper(params, catalog) {
  const {
    largo, ancho,
    productoImper, // clave del producto impermeabilizante seleccionado
    incluirGrietasPequenas = false,
    metrosGrietasPequenas = 0,
    incluirGrietasGrandes = false,
    metrosGrietasGrandes = 0,
    incluirRefuerzo = false,
    tipoRefuerzo = '',
  } = params;

  const area = largo * ancho;
  const finalProducts = [];

  // Impermeabilizante
  if (productoImper) {
    const imperProduct = catalog.find(p => p.clave === productoImper);
    if (!imperProduct) return [];

    const rendimiento = imperProduct.clave.startsWith('S') ? 1 : 1.1; // m²/L
    const litrosNecesarios = (area / rendimiento) * 1.1; // +10% desperdicio

    // Determinar presentaciones disponibles para combinación
    let presentaciones = [];
    if (imperProduct.clave.startsWith('S')) {
      // Sika solo tiene presentación de 18 L (todas las claves de imper Sika son de 18 L)
      presentaciones = [imperProduct];
    } else {
      // Osel: mapeo de presentaciones complementarias (19 L y 4 L)
      const mapeoOsel = {
        'O1672CU': ['O1672CU', 'O1672GA'],
        'O1672GA': ['O1672CU', 'O1672GA'],
        'O1673CU': ['O1673CU', 'O1673GA'],
        'O1673GA': ['O1673CU', 'O1673GA'],
        'O1612CU': ['O1612CU', 'O1612GA'],
        'O1612GA': ['O1612CU', 'O1612GA'],
        'O1613CU': ['O1613CU', 'O1613GA'],
        'O1613GA': ['O1613CU', 'O1613GA'],
      };
      const claves = mapeoOsel[productoImper] || [productoImper];
      presentaciones = claves.map(c => catalog.find(p => p.clave === c)).filter(Boolean);
    }

    // Usar combinarCompuestos (requiere kg, así que usamos litros como kg)
    const presentacionesAdaptadas = presentaciones.map(p => ({ ...p, kg: p.litros }));
    const combinacion = combinarCompuestos(litrosNecesarios, presentacionesAdaptadas);
    for (const { product, quantity } of combinacion) {
      finalProducts.push({ product, customQuantity: quantity, customUnit: 'pza(s)' });
    }
  }

  // Grietas pequeñas (Sika Fill 233)
  if (incluirGrietasPequenas && metrosGrietasPequenas > 0) {
    const sikaFill = catalog.find(p => p.clave === 'S735962GA');
    if (sikaFill) {
      // Rendimiento: 1.25 L por cada 10 m lineales → 0.125 L/m
      const litrosNecesarios = metrosGrietasPequenas * 0.125 * 1.1;
      const qty = Math.ceil(litrosNecesarios / sikaFill.litros);
      finalProducts.push({ product: sikaFill, customQuantity: qty, customUnit: 'pza(s)' });
    }
  }

  // Grietas grandes (Sikaflex 1A)
  if (incluirGrietasGrandes && metrosGrietasGrandes > 0) {
    const sikaflex = catalog.find(p => p.clave === 'S91008SA');
    if (sikaflex) {
      // Rendimiento: 10 m lineales por cartucho
      const qty = Math.ceil(metrosGrietasGrandes / 10);
      finalProducts.push({ product: sikaflex, customQuantity: qty, customUnit: 'pza(s)' });
    }
  }

    // Refuerzo (tela/malla)
  if (incluirRefuerzo && tipoRefuerzo) {
    const refuerzo = catalog.find(p => p.clave === tipoRefuerzo);
    if (refuerzo) {
      const qty = Math.ceil(area * 1.1); // 1 m² por unidad
      finalProducts.push({ product: refuerzo, customQuantity: qty, customUnit: 'm2' });  // ← corregido
    }
  }

  return finalProducts.map(({ product, customQuantity, customUnit }) => ({
    product,
    quantity: customQuantity,
    unit: customUnit || product.unidad,
  }));
}

// ==================== IMPERMEABILIZANTE PREFABRICADO ====================
export function calculateImperPref(params, catalog) {
  const { largo, ancho } = params;
  const area = largo * ancho;

  const finalProducts = [];

  // Manto SikaShield (rendimiento: 9 m² por rollo)
  const manto = catalog.find(p => p.clave === 'S740012RO');
  if (manto) {
    const rollos = Math.ceil(area / 9 * 1.1); // +10% desperdicio
    finalProducts.push({ product: manto, customQuantity: rollos, customUnit: 'rollo(s)' });
  }

  // Primer Emulsika (rendimiento: 4 m²/L, cubeta 19 L)
  const primer = catalog.find(p => p.clave === 'S598672CU');
  if (primer) {
    const litrosNecesarios = area / 4 * 1.1; // +10% desperdicio
    const cubetas = Math.ceil(litrosNecesarios / 19);
    finalProducts.push({ product: primer, customQuantity: cubetas, customUnit: 'pza(s)' });
  }

  return finalProducts.map(({ product, customQuantity, customUnit }) => ({
    product,
    quantity: customQuantity,
    unit: customUnit || product.unidad,
  }));
}