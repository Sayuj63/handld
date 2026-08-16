"use client";

/**
 * ImageEditor — WhatsApp-style inline image markup.
 *
 * Open it on a File, draw on the image (pen / arrow / text, with a colour
 * palette and stroke sizes), undo, clear, and save. `onSave` receives a new
 * File with the annotations flattened in — swap it into your file list.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  InlineStack,
  Modal,
  Text,
  Tooltip,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, UndoIcon } from "@shopify/polaris-icons";

const COLORS = ["#1e1e1e", "#ffffff", "#d82c0d", "#ff8f00", "#f5c518", "#2e7d32", "#1d4fd7", "#8b3df0"];
const SIZES = [3, 6, 12]; // stroke widths (canvas px)
const MAX_DIM = 1600; // longest edge of the working canvas

type Tool = "pen" | "arrow" | "text";

interface Point {
  x: number;
  y: number;
}

interface Shape {
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
  text?: string;
  fontSize?: number;
}

function fitWithin(w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function drawArrow(ctx: CanvasRenderingContext2D, a: Point, b: Point, w: number) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const head = Math.max(12, w * 4);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "pen" && s.points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (s.tool === "arrow" && s.points.length >= 2) {
    drawArrow(ctx, s.points[0], s.points[1], s.width);
  } else if (s.tool === "text" && s.text) {
    ctx.font = `700 ${s.fontSize ?? 24}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textBaseline = "top";
    // White outline for legibility on any background.
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(3, (s.fontSize ?? 24) * 0.12);
    ctx.strokeText(s.text, s.points[0].x, s.points[0].y);
    ctx.fillText(s.text, s.points[0].x, s.points[0].y);
  }
}

export function ImageEditor({
  open,
  file,
  onSave,
  onClose,
}: {
  open: boolean;
  file: File | null;
  onSave: (edited: File) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [working, setWorking] = useState<Shape | null>(null);
  const [textDraft, setTextDraft] = useState<{ left: number; top: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  const drawingRef = useRef<{ start: Point } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const width = SIZES[sizeIdx] ?? 6;

  /* Load the image into the canvas whenever the modal opens. */
  useEffect(() => {
    if (!open || !file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { w, h } = fitWithin(img.naturalWidth || 1, img.naturalHeight || 1, MAX_DIM);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      }
      imgRef.current = img;
      setShapes([]);
      setWorking(null);
      setTextDraft(null);
      setTool("pen");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [open, file]);

  /* Redraw = base image + all committed shapes + the in-progress shape. */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }
    for (const s of shapes) drawShape(ctx, s);
    if (working) drawShape(ctx, working);
  }, [shapes, working]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function toCanvas(e: React.PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!canvasRef.current) return;
    const pt = toCanvas(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "text") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      setTextDraft({
        left: (pt.x / canvas.width) * rect.width,
        top: (pt.y / canvas.height) * rect.height,
      });
      setTextValue("");
      return;
    }

    drawingRef.current = { start: pt };
    if (tool === "pen") setWorking({ tool, color, width, points: [pt] });
    if (tool === "arrow") setWorking({ tool, color, width, points: [pt, pt] });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current || !working) return;
    const pt = toCanvas(e);
    if (tool === "pen") setWorking((w) => (w ? { ...w, points: [...w.points, pt] } : w));
    if (tool === "arrow") setWorking((w) => (w ? { ...w, points: [w.points[0], pt] } : w));
  }

  function onPointerUp() {
    if (working) setShapes((prev) => [...prev, working]);
    setWorking(null);
    drawingRef.current = null;
  }

  function commitText() {
    const value = textValue.trim();
    const canvas = canvasRef.current;
    if (value && canvas && textDraft) {
      const rect = canvas.getBoundingClientRect();
      const pt = {
        x: (textDraft.left / rect.width) * canvas.width,
        y: (textDraft.top / rect.height) * canvas.height,
      };
      const fontSize = Math.max(16, Math.round(canvas.width / 26));
      setShapes((prev) => [...prev, { tool: "text", color, width: fontSize, points: [pt], text: value, fontSize }]);
    }
    setTextDraft(null);
    setTextValue("");
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const base = (file.name || "image").replace(/\.[^.]+$/, "");
        onSave(new File([blob], `${base}-edited.png`, { type: "image/png" }));
        onClose();
      },
      "image/png",
    );
  }

  const cursor = tool === "text" ? "text" : "crosshair";

  return (
    <Modal open={open} onClose={onClose} size="large" limitHeight title="Edit image">
      <Modal.Section>
        <BlockStack gap="300">
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">
              Tool
            </Text>
            <ButtonGroup variant="segmented">
              <Button size="slim" pressed={tool === "pen"} onClick={() => setTool("pen")} icon={EditIcon}>
                Draw
              </Button>
              <Button size="slim" pressed={tool === "arrow"} onClick={() => setTool("arrow")}>
                → Arrow
              </Button>
              <Button size="slim" pressed={tool === "text"} onClick={() => setTool("text")}>
                Aa Text
              </Button>
            </ButtonGroup>
          </InlineStack>

          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">
              Colour
            </Text>
            <InlineStack gap="100" blockAlign="center">
              {COLORS.map((c) => (
                <Tooltip key={c} content={c} dismissOnMouseOut>
                  <button
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => setColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: c,
                      border: color === c ? "3px solid #008060" : "1.5px solid #c9cccf",
                      cursor: "pointer",
                      padding: 0,
                      boxSizing: "border-box",
                    }}
                  />
                </Tooltip>
              ))}
            </InlineStack>
          </InlineStack>

          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">
              Size
            </Text>
            <ButtonGroup variant="segmented">
              <Button size="slim" pressed={sizeIdx === 0} onClick={() => setSizeIdx(0)}>
                S
              </Button>
              <Button size="slim" pressed={sizeIdx === 1} onClick={() => setSizeIdx(1)}>
                M
              </Button>
              <Button size="slim" pressed={sizeIdx === 2} onClick={() => setSizeIdx(2)}>
                L
              </Button>
            </ButtonGroup>
          </InlineStack>

          <Box>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
                background: "#f1f1f1",
                borderRadius: 8,
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "55vh",
                  borderRadius: 8,
                  cursor,
                  touchAction: "none",
                }}
              />
              {textDraft && (
                <input
                  ref={textInputRef}
                  autoFocus
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitText();
                    if (e.key === "Escape") setTextDraft(null);
                  }}
                  onBlur={commitText}
                  placeholder="Type…"
                  style={{
                    position: "absolute",
                    left: Math.min(textDraft.left, 120),
                    top: textDraft.top,
                    zIndex: 5,
                    minWidth: 140,
                    padding: "6px 10px",
                    fontSize: 15,
                    border: "2px solid #008060",
                    borderRadius: 6,
                    outline: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                />
              )}
            </div>
          </Box>

          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200">
              <Button size="slim" onClick={() => setShapes((prev) => prev.slice(0, -1))} icon={UndoIcon} disabled={shapes.length === 0}>
                Undo
              </Button>
              <Button size="slim" tone="critical" onClick={() => setShapes([])} icon={DeleteIcon} disabled={shapes.length === 0}>
                Clear
              </Button>
            </InlineStack>
            <InlineStack gap="200">
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>
                Save
              </Button>
            </InlineStack>
          </InlineStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
