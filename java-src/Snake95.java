/*
 * SPDX-License-Identifier: LicenseRef-AngelOS-Personal-Use
 * Snake95 — Swing arcade game bundled with Angel-OS (runs on the CheerpJ JVM).
 */
import javax.swing.*;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.util.LinkedList;
import java.util.Random;

public class Snake95 extends JPanel {
    private static final int CELL = 16, COLS = 26, ROWS = 20;
    private final LinkedList<Point> snake = new LinkedList<>();
    private final Random rng = new Random();
    private Point food;
    private int dx = 1, dy = 0, score = 0, best = 0;
    private boolean dead = false;
    private final Timer timer;

    public Snake95() {
        setPreferredSize(new Dimension(COLS * CELL, ROWS * CELL + 24));
        setBackground(Color.BLACK);
        setFocusable(true);
        reset();
        addKeyListener(new KeyAdapter() {
            @Override public void keyPressed(KeyEvent e) {
                switch (e.getKeyCode()) {
                    case KeyEvent.VK_UP: case KeyEvent.VK_W: if (dy == 0) { dx = 0; dy = -1; } break;
                    case KeyEvent.VK_DOWN: case KeyEvent.VK_S: if (dy == 0) { dx = 0; dy = 1; } break;
                    case KeyEvent.VK_LEFT: case KeyEvent.VK_A: if (dx == 0) { dx = -1; dy = 0; } break;
                    case KeyEvent.VK_RIGHT: case KeyEvent.VK_D: if (dx == 0) { dx = 1; dy = 0; } break;
                    case KeyEvent.VK_SPACE: case KeyEvent.VK_ENTER: if (dead) reset(); break;
                    default: break;
                }
            }
        });
        timer = new Timer(110, e -> { step(); repaint(); });
        timer.start();
    }

    private void reset() {
        snake.clear();
        for (int i = 0; i < 4; i++) snake.add(new Point(8 - i, 10));
        dx = 1; dy = 0; score = 0; dead = false;
        placeFood();
    }

    private void placeFood() {
        do { food = new Point(rng.nextInt(COLS), rng.nextInt(ROWS)); } while (snake.contains(food));
    }

    private void step() {
        if (dead) return;
        Point h = snake.getFirst();
        Point n = new Point(h.x + dx, h.y + dy);
        if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS || snake.contains(n)) {
            dead = true; best = Math.max(best, score); return;
        }
        snake.addFirst(n);
        if (n.equals(food)) { score += 10; placeFood(); } else snake.removeLast();
    }

    @Override protected void paintComponent(Graphics g0) {
        super.paintComponent(g0);
        Graphics2D g = (Graphics2D) g0;
        g.setColor(new Color(0x003300));
        g.fillRect(0, 24, COLS * CELL, ROWS * CELL);
        g.setColor(Color.RED);
        g.fillOval(food.x * CELL + 2, food.y * CELL + 26, CELL - 4, CELL - 4);
        boolean head = true;
        for (Point p : snake) {
            g.setColor(head ? new Color(0xFFFF00) : new Color(0x00FF66));
            g.fillRect(p.x * CELL + 1, p.y * CELL + 25, CELL - 2, CELL - 2);
            head = false;
        }
        g.setColor(Color.WHITE);
        g.setFont(new Font(Font.MONOSPACED, Font.BOLD, 14));
        g.drawString("SNAKE95 (Java)  Score: " + score + "  Best: " + best, 6, 17);
        if (dead) {
            g.setColor(new Color(0, 0, 0, 170));
            g.fillRect(0, 24, COLS * CELL, ROWS * CELL);
            g.setColor(Color.YELLOW);
            g.drawString("GAME OVER - press SPACE", COLS * CELL / 2 - 95, ROWS * CELL / 2 + 24);
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame f = new JFrame("Snake95 (Java)");
            f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            Snake95 game = new Snake95();
            f.setContentPane(game);
            f.pack();
            f.setLocationRelativeTo(null);
            f.setVisible(true);
            game.requestFocusInWindow();
        });
    }
}
