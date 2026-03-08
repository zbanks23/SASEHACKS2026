import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial, TutorialStep } from '@/context/TutorialContext';

const { width, height } = Dimensions.get('window');

interface TutorialOverlayProps {
  step: TutorialStep;
  message: string;
  subMessage?: string;
  targetRect?: { x: number; y: number; width: number; height: number };
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  onPressAnywhere?: () => void;
  showX?: boolean;
  hideFooter?: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  message,
  subMessage,
  targetRect,
  arrowDirection = 'down',
  onPressAnywhere,
  showX = false,
  hideFooter = false,
}) => {
  const { currentStep, isTutorialActive, nextStep, skipTutorial } = useTutorial();

  if (!isTutorialActive || currentStep !== step) return null;

  const arrowRotation = useMemo(() => {
    switch (arrowDirection) {
      case 'up': return '180deg';
      case 'down': return '0deg';
      case 'left': return '90deg';
      case 'right': return '270deg';
      default: return '0deg';
    }
  }, [arrowDirection]);

  const boxPosition = useMemo(() => {
    if (!targetRect) return { top: height / 3, left: 40, right: 40 };

    const padding = 20;
    const boxWidth = width * 0.85;
    const halfBox = boxWidth / 2;
    const targetCenter = targetRect.x + targetRect.width / 2;
    
    // Center the box over target, but clamp within screen
    let boxLeft = targetCenter - halfBox;
    boxLeft = Math.max(10, Math.min(width - boxWidth - 10, boxLeft));

    if (arrowDirection === 'down') {
      return { 
        bottom: height - targetRect.y + 40, // Raised for bottom bar visibility
        left: boxLeft, 
        width: boxWidth 
      };
    }
    if (arrowDirection === 'up') {
      return { 
        top: targetRect.y + targetRect.height + padding, 
        left: boxLeft, 
        width: boxWidth 
      };
    }
    if (arrowDirection === 'left') {
      return { 
        top: targetRect.y, 
        left: targetRect.x + targetRect.width + padding, 
        right: 20 
      };
    }
    if (arrowDirection === 'right') {
      return { 
        top: targetRect.y, 
        right: width - targetRect.x + padding, 
        left: 20 
      };
    }

    return { top: height / 3, left: boxLeft, width: boxWidth };
  }, [targetRect, arrowDirection]);

  const Arrow = () => {
    if (!targetRect) return null;

    const boxWidth = (boxPosition as any).width || (width - 80);
    const arrowWidth = 30;
    
    // Calculate target center relative to box's left edge
    const targetCenter = targetRect.x + targetRect.width / 2;
    const boxLeft = (boxPosition as any).left || 40;
    let arrowLeft = targetCenter - boxLeft - arrowWidth / 2;
    
    // Constrain arrow within the box with some padding
    const minArrowLeft = 10;
    const maxArrowLeft = boxWidth - arrowWidth - 10;
    arrowLeft = Math.max(minArrowLeft, Math.min(maxArrowLeft, arrowLeft));

    let arrowVerticalPos = {};
    if (arrowDirection === 'down') {
      arrowVerticalPos = { bottom: -24 };
    } else if (arrowDirection === 'up') {
      arrowVerticalPos = { top: -24 };
    } else if (arrowDirection === 'left') {
      return (
        <View style={[styles.arrowContainer, { left: -25, top: '20%', transform: [{ rotate: '90deg' }] }]}>
          <Ionicons name="arrow-down" size={30} color="#007AFF" />
        </View>
      );
    } else if (arrowDirection === 'right') {
       return (
        <View style={[styles.arrowContainer, { right: -25, top: '20%', transform: [{ rotate: '270deg' }] }]}>
          <Ionicons name="arrow-down" size={30} color="#007AFF" />
        </View>
      );
    }

    return (
      <View style={[styles.arrowContainer, arrowVerticalPos, { left: arrowLeft, transform: [{ rotate: arrowRotation }] }]}>
        <Ionicons name="arrow-down" size={30} color="#007AFF" />
      </View>
    );
  };

  const content = (
    <View 
      style={styles.container} 
      pointerEvents="box-none"
    >
      <View 
        style={[styles.fullOverlay, !onPressAnywhere && { backgroundColor: 'transparent' }]} 
        pointerEvents={onPressAnywhere ? 'auto' : 'none'}
      >
        {onPressAnywhere && (
          <TouchableOpacity 
            style={styles.fullOverlay} 
            activeOpacity={1}
            onPress={onPressAnywhere}
          />
        )}
      </View>

      <View 
        style={[styles.messageBox, boxPosition]}
        pointerEvents="auto"
      >
        <Arrow />
        
        <Text style={styles.messageText}>{message}</Text>
        {subMessage && <Text style={styles.subMessageText}>{subMessage}</Text>}
        
        {!hideFooter && (
          <View style={styles.footer}>
            {!onPressAnywhere && (
              <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                <Text style={styles.nextButtonText}>Got it!</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.skipButton} onPress={skipTutorial}>
              <Text style={styles.skipButtonText}>Skip Tutorial</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showX && targetRect && (
        <View style={[styles.xHighlight, { 
          top: targetRect.y - 10, 
          left: targetRect.x - 10,
          width: targetRect.width + 20,
          height: targetRect.height + 20,
        }]} pointerEvents="none">
           <Ionicons name="close-circle" size={40} color="#FF3B30" />
        </View>
      )}
    </View>
  );

  return content;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  messageBox: {
    position: 'absolute',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  arrowContainer: {
    position: 'absolute',
  },
  messageText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessageText: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  xHighlight: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
