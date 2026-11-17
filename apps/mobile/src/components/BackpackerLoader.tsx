import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

interface BackpackerLoaderProps {
  message?: string;
  submessage?: string;
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
}

export function BackpackerLoader({
  message = 'Explorando la zona…',
  submessage = 'Buscando las mejores recomendaciones verificadas',
  size = 'medium',
  compact = false,
}: BackpackerLoaderProps): React.JSX.Element {
  const scale = size === 'small' ? 0.7 : size === 'large' ? 1.25 : 1;
  const bobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -6,
          duration: 425,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 425,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bobAnim]);

  const dim = 140 * scale;

  return (
    <View
      style={[
        styles.container,
        { paddingVertical: compact ? 16 : 36, paddingHorizontal: compact ? 16 : 24 },
      ]}
    >
      <Animated.View
        style={{
          width: dim,
          height: dim,
          transform: [{ translateY: bobAnim }],
        }}
      >
        <Svg viewBox="0 0 160 160" width={dim} height={dim}>
          {/* Suelo y rastro de senderismo */}
          <Line
            x1="15"
            y1="138"
            x2="145"
            y2="138"
            stroke="#e2e8f0"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Line
            x1="25"
            y1="138"
            x2="135"
            y2="138"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="6, 10"
            strokeLinecap="round"
          />

          {/* Polvillo bajo las botas */}
          <Circle cx="48" cy="134" r="3.5" fill="#cbd5e1" />
          <Circle cx="42" cy="136" r="2.5" fill="#94a3b8" />

          {/* Pin flotante de destino al frente */}
          <G transform="translate(122, 45)">
            <Path
              d="M0 0 C-6 -6 -10 -13 -10 -20 C-10 -28 -3 -34 5 -34 C13 -34 20 -28 20 -20 C20 -13 16 -6 10 0 L5 8 Z"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <Circle cx="5" cy="-20" r="4" fill="#ffffff" />
          </G>

          {/* PIERNA TRASERA */}
          <G>
            <Line
              x1="76"
              y1="105"
              x2="66"
              y2="122"
              stroke="#1e293b"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <Line
              x1="66"
              y1="122"
              x2="60"
              y2="135"
              stroke="#334155"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Path
              d="M56 135 L68 135 L70 138 L54 138 Z"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="1"
            />
          </G>

          {/* MOCHILA DE VIAJE */}
          <G>
            <Rect
              x="42"
              y="65"
              width="24"
              height="34"
              rx="6"
              fill="#ea580c"
              stroke="#c2410c"
              strokeWidth="2"
            />
            <Rect
              x="38"
              y="74"
              width="12"
              height="18"
              rx="3"
              fill="#f97316"
              stroke="#c2410c"
              strokeWidth="1.5"
            />
            <Rect
              x="40"
              y="55"
              width="28"
              height="11"
              rx="5"
              fill="#0284c7"
              stroke="#0369a1"
              strokeWidth="1.5"
            />
            <Line x1="48" y1="55" x2="48" y2="66" stroke="#0369a1" strokeWidth="1.5" />
            <Line x1="60" y1="55" x2="60" y2="66" stroke="#0369a1" strokeWidth="1.5" />
            <Rect x="39" y="80" width="5" height="12" rx="2" fill="#38bdf8" />
          </G>

          {/* TORSO / CAMISETA VERDE EXPLORO */}
          <Path
            d="M66 70 L92 70 L88 104 L70 104 Z"
            fill="#10b981"
            stroke="#059669"
            strokeWidth="2"
          />
          <Path d="M71 70 L72 104" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <Path d="M84 70 L83 104" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <Line x1="72" y1="84" x2="83" y2="84" stroke="#c2410c" strokeWidth="2.5" />
          <Circle cx="77" cy="84" r="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />

          {/* PIERNA DELANTERA */}
          <G>
            <Line
              x1="82"
              y1="105"
              x2="94"
              y2="121"
              stroke="#0f172a"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <Line
              x1="94"
              y1="121"
              x2="102"
              y2="135"
              stroke="#1e293b"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Path
              d="M98 135 L112 135 L114 138 L96 138 Z"
              fill="#92400e"
              stroke="#451a03"
              strokeWidth="1"
            />
          </G>

          {/* CABEZA, ROSTRO Y SOMBRERO MOCHILERO */}
          <Rect x="76" y="62" width="7" height="9" fill="#fbcfe8" rx="2" />
          <Circle cx="80" cy="54" r="12" fill="#fed7aa" stroke="#f97316" strokeWidth="1" />
          <Rect x="80" y="49" width="12" height="6" rx="2.5" fill="#0f172a" />
          <Line x1="78" y1="52" x2="80" y2="52" stroke="#0f172a" strokeWidth="1.5" />
          <Path
            d="M82 59 Q87 63 91 59"
            fill="none"
            stroke="#9a3412"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Ellipse
            cx="80"
            cy="45"
            rx="19"
            ry="5.5"
            fill="#ca8a04"
            stroke="#a16207"
            strokeWidth="1.5"
          />
          <Path
            d="M68 45 C68 34 73 31 80 31 C87 31 92 34 92 45 Z"
            fill="#eab308"
            stroke="#a16207"
            strokeWidth="1.5"
          />
          <Path
            d="M69 43 Q80 46 91 43"
            fill="none"
            stroke="#78350f"
            strokeWidth="2.5"
          />

          {/* BRAZO DELANTERO Y BASTÓN DE SENDERISMO */}
          <G>
            <Line
              x1="84"
              y1="74"
              x2="98"
              y2="92"
              stroke="#fed7aa"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <Circle cx="98" cy="92" r="3.5" fill="#fed7aa" />
            <Line
              x1="97"
              y1="78"
              x2="108"
              y2="138"
              stroke="#475569"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <Line
              x1="96"
              y1="78"
              x2="98"
              y2="90"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <Circle cx="106" cy="133" r="3" fill="#0f172a" />
          </G>
        </Svg>
      </Animated.View>

      <View style={styles.textWrap}>
        <Text
          style={[
            styles.title,
            { fontSize: size === 'small' ? 14.5 : 17 },
          ]}
        >
          {message}
        </Text>
        {Boolean(submessage) && (
          <Text
            style={[
              styles.subtitle,
              { fontSize: size === 'small' ? 12 : 13 },
            ]}
          >
            {submessage}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    marginVertical: 8,
  },
  textWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 320,
  },
});
