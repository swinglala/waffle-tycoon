import { useState, useEffect } from 'react';
import { ScreenManager } from './ScreenManager';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ShopScreen from './screens/ShopScreen';
import DayTreeScreen from './screens/DayTreeScreen';
import SettingsScreen from './screens/SettingsScreen';
import './styles.css';

const SCREENS: Record<string, React.FC> = {
  home: HomeScreen,
  login: LoginScreen,
  shop: ShopScreen,
  daytree: DayTreeScreen,
  settings: SettingsScreen,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);

  useEffect(() => {
    const sm = ScreenManager.getInstance();
    sm.setRenderCallback(setCurrentScreen);
    return () => sm.setRenderCallback(null);
  }, []);

  if (!currentScreen) return null;

  const Screen = SCREENS[currentScreen];
  return Screen ? <Screen /> : null;
}
