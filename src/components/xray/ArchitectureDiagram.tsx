'use client';

import { useState } from 'react';

interface ArchResult {
  num_layers: number;
  num_attention_heads: number;
  num_kv_heads: number;
  hidden_size: number;
  intermediate_size: number;
  is_moe: boolean;
  num_experts?: number;
  attention_type: string; // "GQA" | "MHA" | "MQA"
  head_dim: number;
}

interface ArchitectureDiagramProps {
  archResult: ArchResult;
}

const ATTENTION_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  GQA: { fill: '#10B981', stroke: '#059669', label: 'Grouped-Query Attention' },
  MHA: { fill: '#6366F1', stroke: '#4F46E5', label: 'Multi-Head Attention' },
  MQA: { fill: '#F59E0B', stroke: '#D97706', label: 'Multi-Query Attention' },
};

interface LayerTooltip {
  layerIdx: number;
  x: number;
  y: number;
}

function getVisibleLayers(total: number): { index: number; isEllipsis: boolean }[] {
  if (total <= 10) {
    return Array.from({ length: total }, (_, i) => ({ index: i, isEllipsis: false }));
  }
  const layers: { index: number; isEllipsis: boolean }[] = [];
  for (let i = 0; i < 4; i++) layers.push({ index: i, isEllipsis: false });
  layers.push({ index: -1, isEllipsis: true });
  for (let i = total - 3; i < total; i++) layers.push({ index: i, isEllipsis: false });
  return layers;
}

export default function ArchitectureDiagram({ archResult }: ArchitectureDiagramProps) {
  const [tooltip, setTooltip] = useState<LayerTooltip | null>(null);

  const {
    num_layers,
    num_attention_heads,
    num_kv_heads,
    hidden_size,
    intermediate_size,
    is_moe,
    num_experts,
    attention_type,
    head_dim,
  } = archResult;

  const attColor = ATTENTION_COLORS[attention_type] ?? ATTENTION_COLORS.MHA;
  const visibleLayers = getVisibleLayers(num_layers);

  const layerH = 60;
  const layerGap = 8;
  const blockW = 420;
  const leftPad = 80;
  const topPad = 50;
  const totalH = topPad + visibleLayers.length * (layerH + layerGap) + 60;
  const svgW = blockW + leftPad + 40;

  const handleLayerClick = (layerIdx: number, x: number, y: number) => {
    if (tooltip?.layerIdx === layerIdx) {
      setTooltip(null);
    } else {
      setTooltip({ layerIdx, x, y });
    }
  };

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">Architecture Diagram</h3>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: attColor.fill }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: attColor.fill }}
            />
            {attColor.label}
          </span>
          {is_moe && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-purple-500" />
              MoE ({num_experts} experts)
            </span>
          )}
        </div>
      </div>

      {/* Dimension labels */}
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-[#475569]">
        <span>
          Layers: <span className="font-mono text-[#0F172A]">{num_layers}</span>
        </span>
        <span>
          Hidden: <span className="font-mono text-[#0F172A]">{hidden_size}</span>
        </span>
        <span>
          Heads: <span className="font-mono text-[#0F172A]">{num_attention_heads}</span>
          {num_kv_heads !== num_attention_heads && (
            <> (KV: <span className="font-mono text-[#0F172A]">{num_kv_heads}</span>)</>
          )}
        </span>
        <span>
          Head dim: <span className="font-mono text-[#0F172A]">{head_dim}</span>
        </span>
        <span>
          FFN: <span className="font-mono text-[#0F172A]">{intermediate_size}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={svgW}
          height={totalH}
          viewBox={`0 0 ${svgW} ${totalH}`}
          className="mx-auto"
        >
          {/* Input embedding */}
          <rect
            x={leftPad}
            y={10}
            width={blockW}
            height={28}
            rx={6}
            fill="#E2E8F0"
            stroke="#CBD5E1"
            strokeWidth={1}
          />
          <text
            x={leftPad + blockW / 2}
            y={28}
            textAnchor="middle"
            fill="#475569"
            fontSize={11}
            fontFamily="monospace"
          >
            Input Embedding ({hidden_size})
          </text>

          {/* Connecting line from embedding to first layer */}
          <line
            x1={leftPad + blockW / 2}
            y1={38}
            x2={leftPad + blockW / 2}
            y2={topPad}
            stroke="#CBD5E1"
            strokeWidth={1}
            strokeDasharray="4 2"
          />

          {visibleLayers.map((layer, vIdx) => {
            const yOffset = topPad + vIdx * (layerH + layerGap);

            if (layer.isEllipsis) {
              return (
                <g key="ellipsis">
                  <text
                    x={leftPad + blockW / 2}
                    y={yOffset + layerH / 2 + 4}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize={16}
                    fontWeight="bold"
                  >
                    ...
                  </text>
                  <text
                    x={leftPad + blockW / 2}
                    y={yOffset + layerH / 2 + 20}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize={10}
                  >
                    {num_layers - 7} more layers
                  </text>
                </g>
              );
            }

            const attnW = is_moe ? blockW * 0.4 : blockW * 0.45;
            const mlpW = is_moe ? blockW * 0.55 : blockW * 0.5;
            const gap = blockW - attnW - mlpW;

            return (
              <g
                key={layer.index}
                className="cursor-pointer"
                onClick={() =>
                  handleLayerClick(layer.index, leftPad + blockW / 2, yOffset)
                }
              >
                {/* Layer index label */}
                <text
                  x={leftPad - 10}
                  y={yOffset + layerH / 2 + 4}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  L{layer.index}
                </text>

                {/* Layer background */}
                <rect
                  x={leftPad}
                  y={yOffset}
                  width={blockW}
                  height={layerH}
                  rx={8}
                  fill="#F8FAFC"
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />

                {/* Attention block */}
                <rect
                  x={leftPad + 4}
                  y={yOffset + 4}
                  width={attnW - 4}
                  height={layerH - 8}
                  rx={6}
                  fill={attColor.fill + '18'}
                  stroke={attColor.stroke}
                  strokeWidth={1}
                />
                <text
                  x={leftPad + 4 + (attnW - 4) / 2}
                  y={yOffset + 22}
                  textAnchor="middle"
                  fill={attColor.fill}
                  fontSize={10}
                  fontWeight="600"
                >
                  {attention_type}
                </text>
                {/* Head indicators */}
                {(() => {
                  const maxDots = Math.min(num_attention_heads, 16);
                  const dotR = 3;
                  const dotGap = 2;
                  const dotsPerRow = Math.min(maxDots, 8);
                  const rows = Math.ceil(maxDots / dotsPerRow);
                  const totalDotsW = dotsPerRow * (dotR * 2 + dotGap) - dotGap;
                  const startX = leftPad + 4 + (attnW - 4) / 2 - totalDotsW / 2;
                  const startY = yOffset + 32;

                  return Array.from({ length: maxDots }, (_, di) => {
                    const row = Math.floor(di / dotsPerRow);
                    const col = di % dotsPerRow;
                    return (
                      <circle
                        key={di}
                        cx={startX + col * (dotR * 2 + dotGap) + dotR}
                        cy={startY + row * (dotR * 2 + dotGap) + dotR}
                        r={dotR}
                        fill={attColor.fill}
                        opacity={0.6}
                      />
                    );
                  });
                })()}

                {/* MLP / MoE block */}
                <rect
                  x={leftPad + attnW + gap}
                  y={yOffset + 4}
                  width={mlpW - 4}
                  height={layerH - 8}
                  rx={6}
                  fill={is_moe ? '#A855F718' : '#6366F118'}
                  stroke={is_moe ? '#9333EA' : '#4F46E5'}
                  strokeWidth={1}
                />

                {is_moe ? (
                  <>
                    <text
                      x={leftPad + attnW + gap + (mlpW - 4) / 2}
                      y={yOffset + 20}
                      textAnchor="middle"
                      fill="#A855F7"
                      fontSize={10}
                      fontWeight="600"
                    >
                      MoE Router
                    </text>
                    {/* Expert fan-out visualization */}
                    {(() => {
                      const numExp = num_experts ?? 8;
                      const maxShown = Math.min(numExp, 8);
                      const routerX = leftPad + attnW + gap + (mlpW - 4) / 2;
                      const routerY = yOffset + 26;
                      const expertGap = (mlpW - 20) / (maxShown + 1);
                      const expertStartX = leftPad + attnW + gap + 10;

                      return (
                        <>
                          {Array.from({ length: maxShown }, (_, ei) => {
                            const ex = expertStartX + (ei + 1) * expertGap;
                            const ey = yOffset + layerH - 14;
                            return (
                              <g key={ei}>
                                <line
                                  x1={routerX}
                                  y1={routerY}
                                  x2={ex}
                                  y2={ey - 4}
                                  stroke="#9333EA"
                                  strokeWidth={0.7}
                                  opacity={0.5}
                                />
                                <rect
                                  x={ex - 6}
                                  y={ey - 4}
                                  width={12}
                                  height={8}
                                  rx={2}
                                  fill="#9333EA"
                                  opacity={0.5}
                                />
                              </g>
                            );
                          })}
                          {numExp > maxShown && (
                            <text
                              x={leftPad + attnW + gap + mlpW - 14}
                              y={yOffset + layerH - 6}
                              fill="#475569"
                              fontSize={8}
                            >
                              +{numExp - maxShown}
                            </text>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <text
                      x={leftPad + attnW + gap + (mlpW - 4) / 2}
                      y={yOffset + 24}
                      textAnchor="middle"
                      fill="#6366F1"
                      fontSize={10}
                      fontWeight="600"
                    >
                      Feed-Forward
                    </text>
                    <text
                      x={leftPad + attnW + gap + (mlpW - 4) / 2}
                      y={yOffset + 40}
                      textAnchor="middle"
                      fill="#475569"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {hidden_size} &rarr; {intermediate_size}
                    </text>
                  </>
                )}

                {/* Connecting line to next layer */}
                {vIdx < visibleLayers.length - 1 && (
                  <line
                    x1={leftPad + blockW / 2}
                    y1={yOffset + layerH}
                    x2={leftPad + blockW / 2}
                    y2={yOffset + layerH + layerGap}
                    stroke="#CBD5E1"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                )}
              </g>
            );
          })}

          {/* Output head */}
          {(() => {
            const lastY = topPad + visibleLayers.length * (layerH + layerGap);
            return (
              <>
                <line
                  x1={leftPad + blockW / 2}
                  y1={lastY - layerGap}
                  x2={leftPad + blockW / 2}
                  y2={lastY + 2}
                  stroke="#CBD5E1"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
                <rect
                  x={leftPad}
                  y={lastY + 2}
                  width={blockW}
                  height={28}
                  rx={6}
                  fill="#E2E8F0"
                  stroke="#CBD5E1"
                  strokeWidth={1}
                />
                <text
                  x={leftPad + blockW / 2}
                  y={lastY + 20}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  LM Head
                </text>
              </>
            );
          })()}

          {/* Tooltip overlay */}
          {tooltip && (
            <g>
              <rect
                x={tooltip.x - 130}
                y={tooltip.y - 70}
                width={260}
                height={60}
                rx={8}
                fill="#E2E8F0"
                stroke="#CBD5E1"
                strokeWidth={1}
              />
              <text
                x={tooltip.x}
                y={tooltip.y - 50}
                textAnchor="middle"
                fill="#0F172A"
                fontSize={11}
                fontWeight="600"
              >
                Layer {tooltip.layerIdx}
              </text>
              <text
                x={tooltip.x}
                y={tooltip.y - 34}
                textAnchor="middle"
                fill="#475569"
                fontSize={10}
              >
                {attention_type} ({num_attention_heads}h / {num_kv_heads}kv) | dim {head_dim}
                {is_moe ? ` | ${num_experts} experts` : ` | FFN ${intermediate_size}`}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
