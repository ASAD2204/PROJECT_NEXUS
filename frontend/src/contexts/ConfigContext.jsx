import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { opsAPI } from '../api/ops';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    campusName: 'Project Nexus',
    campusAddress: 'University Campus',
    campusEmail: 'admin@nexus.edu',
    campusPhone: '+92 300 1234567',
    campusLogo: '',
  });
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const res = await opsAPI.getSettings();
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Failed to fetch global settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <ConfigContext.Provider value={{ config, refreshConfig, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};
