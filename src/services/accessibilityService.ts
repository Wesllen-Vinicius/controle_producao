import { AccessibilityInfo, findNodeHandle } from 'react-native';

export class AccessibilityService {
  private static instance: AccessibilityService;
  private screenReaderEnabled = false;
  private reducedMotionEnabled = false;

  private constructor() {
    this.initializeAccessibility();
  }

  static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  private async initializeAccessibility() {
    try {
      // Verificar se o leitor de tela está habilitado
      this.screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      // Verificar se motion reduzida está habilitada
      this.reducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

      // Listeners para mudanças de configuração
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        this.screenReaderEnabled = enabled;
      });

      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        this.reducedMotionEnabled = enabled;
      });
    } catch (error) {
      console.warn('Failed to initialize accessibility settings:', error);
    }
  }

  // Getters para configurações de acessibilidade
  get isScreenReaderEnabled(): boolean {
    return this.screenReaderEnabled;
  }

  get isReducedMotionEnabled(): boolean {
    return this.reducedMotionEnabled;
  }

  // Anunciar mensagens para leitores de tela
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Focar em um elemento específico
  focusElement(elementRef: any): void {
    if (elementRef && elementRef.current) {
      const nodeHandle = findNodeHandle(elementRef.current);
      if (nodeHandle) {
        AccessibilityInfo.setAccessibilityFocus(nodeHandle);
      }
    }
  }

  // Gerar propriedades de acessibilidade para componentes
  getAccessibilityProps(config: {
    label?: string;
    hint?: string;
    role?: 'button' | 'text' | 'image' | 'header' | 'link' | 'search' | 'none';
    state?: {
      disabled?: boolean;
      selected?: boolean;
      expanded?: boolean;
      busy?: boolean;
    };
    value?: {
      min?: number;
      max?: number;
      now?: number;
      text?: string;
    };
    live?: 'none' | 'polite' | 'assertive';
  }) {
    const props: any = {};

    if (config.label) {
      props.accessibilityLabel = config.label;
    }

    if (config.hint) {
      props.accessibilityHint = config.hint;
    }

    if (config.role) {
      props.accessibilityRole = config.role;
    }

    if (config.state) {
      props.accessibilityState = config.state;
    }

    if (config.value) {
      props.accessibilityValue = config.value;
    }

    if (config.live) {
      props.accessibilityLiveRegion = config.live;
    }

    return props;
  }

  // Configurações de animação baseadas em preferências
  getAnimationConfig(defaultDuration: number = 300) {
    return {
      duration: this.reducedMotionEnabled ? 0 : defaultDuration,
      useNativeDriver: true,
    };
  }

  // Gerar descrições contextuais para listas
  generateListItemAccessibilityLabel(item: {
    title: string;
    subtitle?: string;
    position?: number;
    total?: number;
    status?: string;
  }): string {
    let label = item.title;
    
    if (item.subtitle) {
      label += `, ${item.subtitle}`;
    }
    
    if (item.position && item.total) {
      label += `, item ${item.position} de ${item.total}`;
    }
    
    if (item.status) {
      label += `, status: ${item.status}`;
    }
    
    return label;
  }

  // Helpers para formulários acessíveis
  getFormFieldAccessibilityProps(config: {
    label: string;
    required?: boolean;
    error?: string;
    value?: string;
    placeholder?: string;
  }) {
    const props = this.getAccessibilityProps({
      label: config.label,
      role: 'text',
      state: {
        disabled: false,
      }
    });

    let hint = '';
    
    if (config.required) {
      hint += 'Campo obrigatório. ';
    }
    
    if (config.placeholder && !config.value) {
      hint += `Exemplo: ${config.placeholder}. `;
    }
    
    if (config.error) {
      hint += `Erro: ${config.error}`;
      props.accessibilityState = { ...props.accessibilityState, invalid: true };
    }

    if (hint) {
      props.accessibilityHint = hint.trim();
    }

    return props;
  }

  // Helpers para botões acessíveis
  getButtonAccessibilityProps(config: {
    title: string;
    action?: string;
    disabled?: boolean;
    loading?: boolean;
  }) {
    let label = config.title;
    
    if (config.action) {
      label += `, ${config.action}`;
    }
    
    let hint = '';
    if (config.loading) {
      hint = 'Carregando, aguarde';
    } else if (config.disabled) {
      hint = 'Botão desabilitado';
    } else {
      hint = 'Toque duplo para ativar';
    }

    return this.getAccessibilityProps({
      label,
      hint,
      role: 'button',
      state: {
        disabled: config.disabled,
        busy: config.loading,
      }
    });
  }

  // Helpers para navegação
  announceScreenChange(screenName: string, description?: string): void {
    let message = `Tela ${screenName} carregada`;
    if (description) {
      message += `. ${description}`;
    }
    this.announce(message, 'polite');
  }

  // Helpers para feedback de ações
  announceActionFeedback(action: string, result: 'success' | 'error', details?: string): void {
    let message = '';
    
    if (result === 'success') {
      message = `${action} realizada com sucesso`;
    } else {
      message = `Erro ao ${action.toLowerCase()}`;
    }
    
    if (details) {
      message += `. ${details}`;
    }
    
    this.announce(message, result === 'error' ? 'assertive' : 'polite');
  }

  // Validar se um texto é acessível
  validateAccessibilityText(text: string): {
    isValid: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    
    if (text.length < 3) {
      suggestions.push('Texto muito curto para leitores de tela');
    }
    
    if (text.length > 200) {
      suggestions.push('Texto muito longo, considere resumir');
    }
    
    if (/^[A-Z\s]+$/.test(text)) {
      suggestions.push('Evite texto totalmente em maiúsculas');
    }
    
    if (!/[a-zA-ZÀ-ÿ]/.test(text)) {
      suggestions.push('Adicione texto descritivo além de números/símbolos');
    }
    
    return {
      isValid: suggestions.length === 0,
      suggestions
    };
  }
}

export const accessibilityService = AccessibilityService.getInstance();
export default accessibilityService;