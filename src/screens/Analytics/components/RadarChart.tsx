import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';

interface Props {
  labels: string[];
  values: number[];
  maxValue: number;
  size: number;
  fillColor?: string;
  strokeColor?: string;
}

const PADDING = 28;

interface Point { x: number; y: number; }

function polar(center: number, radius: number, angle: number): Point {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function pointsToString(points: Point[]): string {
  return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

export default function RadarChart({
  labels,
  values,
  maxValue,
  size,
  fillColor = 'rgba(0, 122, 255, 0.3)',
  strokeColor = 'rgba(0, 122, 255, 0.85)',
}: Props) {
  const center = size / 2;
  const radius = size / 2 - PADDING;
  const n = labels.length;

  if (n < 3 || values.length !== n) {
    return <View style={{ width: size, height: size }} />;
  }

  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    angles.push((2 * Math.PI * i) / n - Math.PI / 2);
  }

  const axisVertices: Point[] = angles.map(a => polar(center, radius, a));

  const rings = [0.25, 0.5, 0.75, 1.0];
  const backgroundPolygons = rings.map(pct =>
    angles.map(a => polar(center, radius * pct, a))
  );

  const dataVertices: Point[] = angles.map((a, i) => {
    const scale = Math.max(0, Math.min(1, values[i] / maxValue));
    return polar(center, radius * scale, a);
  });

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {backgroundPolygons.map((poly, idx) => (
          <Polygon
            key={`ring-${idx}`}
            points={pointsToString(poly)}
            fill="none"
            stroke="#E5E5EA"
            strokeWidth={1}
          />
        ))}
        {axisVertices.map((v, idx) => (
          <Line
            key={`axis-${idx}`}
            x1={center}
            y1={center}
            x2={v.x}
            y2={v.y}
            stroke="#D0D0D5"
            strokeWidth={1}
          />
        ))}
        <Polygon
          points={pointsToString(dataVertices)}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
        />
        {dataVertices.map((v, idx) => (
          <Circle
            key={`dot-${idx}`}
            cx={v.x}
            cy={v.y}
            r={3}
            fill={strokeColor}
          />
        ))}
        {axisVertices.map((v, idx) => {
          const angle = angles[idx];
          const outward = polar(center, radius + 14, angle);
          const cos = Math.cos(angle);
          const anchor: 'middle' | 'start' | 'end' =
            cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
          return (
            <SvgText
              key={`label-${idx}`}
              x={outward.x}
              y={outward.y + 4}
              fill="#333"
              fontSize={11}
              fontWeight="500"
              textAnchor={anchor}
            >
              {labels[idx]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
