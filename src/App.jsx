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
        <Layout onSettingsClick={() => setShowLogin(true)}>
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