import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';
import CalculatorSimple from './components/CalculatorSimple';
import CalculatorPlafon from './components/CalculatorPlafon';
import CalculatorMuroExterior from './components/CalculatorMuroExterior';
import CalculatorPintura from './components/CalculatorPintura';
import CalculatorImper from './components/CalculatorImper';
import CalculatorImperPref from './components/CalculatorImperPref';
import RecipeSelector from './components/RecipeSelector';
import SplashScreen from './components/SplashScreen';
import { fetchRecipes } from './api';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // 🛠️ ESTADOS PARA LA INSTALACIÓN DE LA PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // Escuchar la petición de instalación del navegador
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Evita el banner automático del navegador
      setDeferredPrompt(e); // Guarda el evento en memoria
      setShowInstallBtn(true); // Muestra tu botón personalizado
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si el usuario ya la instaló con éxito, limpia los estados
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      console.log('¡Cuantificador OBS instalado correctamente!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 🚀 FUNCIÓN DISPARADORA DE INSTALACIÓN
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Despliega la ventana nativa de confirmación (Igual que Photopea)
    deferredPrompt.prompt();
    
    // Conoce la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`El usuario eligió: ${outcome}`);
    
    // Se limpia el prompt ya que solo es de un único uso
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    fetchRecipes().then(data => {
      const parsed = data.map(r => ({
        ...r,
        productos: (typeof r.productos === 'string' ? JSON.parse(r.productos) : (r.productos || [])).map(p => ({ ...p, factor: p.factor || 1 })),
      }));
      setRecipes(parsed);
    });
  }, []);

  const handleSelectRecipe = (recipe) => setSelectedRecipe(recipe);
  const handleBack = () => setSelectedRecipe(null);
  const handleLogin = () => { setIsAdmin(true); setShowLogin(false); };
  const handleLogout = () => setIsAdmin(false);

  return (
    <>
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <div className="animate-fadeIn relative min-h-screen">
        {/* 🛠️ PASAMOS LOS PROPS DE INSTALACIÓN AL LAYOUT */}
        <Layout 
          onSettingsClick={() => setShowLogin(true)}
          showInstallBtn={showInstallBtn}
          onInstallClick={handleInstallClick}
        >
          {isAdmin ? (
            <AdminPanel onLogout={handleLogout} />
          ) : selectedRecipe ? (
            /* 🚀 ENVOLTURAS MAESTRAS: Este div absorbe el impacto del renderizado 
               y hace que la calculadora entre flotando suavemente desde abajo */
            <div className="w-full animate-pageTransition">
              {selectedRecipe.tipo === 'pintura' ? (
                <CalculatorPintura onBack={handleBack} />
              ) : selectedRecipe.tipo === 'imper' ? (
                <CalculatorImper onBack={handleBack} />
              ) : selectedRecipe.tipo === 'imper_pref' ? (
                <CalculatorImperPref onBack={handleBack} />
              ) : selectedRecipe.tipo === 'plafon' ? (
                <CalculatorPlafon recipe={selectedRecipe} onBack={handleBack} />
              ) : selectedRecipe.tipo === 'muro_exterior' ? (
                <CalculatorMuroExterior recipe={selectedRecipe} onBack={handleBack} />
              ) : (
                <CalculatorSimple recipe={selectedRecipe} onBack={handleBack} />
              )}
            </div>
          ) : (
            /* Al regresar al menú, también entra con una transición limpia */
            <div className="w-full animate-fadeIn">
              <RecipeSelector recipes={recipes} onSelect={handleSelectRecipe} />
            </div>
          )}
          {showLogin && !isAdmin && (
            <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />
          )}
        </Layout>
      </div>
    </>
  );
}

export default App;