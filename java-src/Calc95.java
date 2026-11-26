/*
 * SPDX-License-Identifier: LicenseRef-AngelOS-Personal-Use
 * Calc95 — Swing calculator bundled with Angel-OS (runs on the CheerpJ JVM).
 */
import javax.swing.*;
import java.awt.*;
import java.math.BigDecimal;
import java.math.MathContext;

public class Calc95 extends JFrame {
    private final JTextField display = new JTextField("0");
    private BigDecimal acc = BigDecimal.ZERO;
    private String pendingOp = null;
    private boolean fresh = true;

    public Calc95() {
        super("Calc95 (Java)");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        display.setEditable(false);
        display.setHorizontalAlignment(JTextField.RIGHT);
        display.setFont(new Font(Font.MONOSPACED, Font.BOLD, 22));
        display.setBackground(new Color(0xE8F5E9));

        JPanel keys = new JPanel(new GridLayout(5, 4, 4, 4));
        String[] labels = {"C", "±", "%", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "√", "="};
        for (String l : labels) {
            JButton b = new JButton(l);
            b.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 16));
            b.addActionListener(e -> press(l));
            keys.add(b);
        }
        JPanel root = new JPanel(new BorderLayout(6, 6));
        root.setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
        root.setBackground(new Color(0xC0C0C0));
        keys.setBackground(new Color(0xC0C0C0));
        root.add(display, BorderLayout.NORTH);
        root.add(keys, BorderLayout.CENTER);
        setContentPane(root);
        setSize(300, 360);
        setLocationRelativeTo(null);
    }

    private BigDecimal cur() {
        try { return new BigDecimal(display.getText()); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private void show(BigDecimal v) {
        display.setText(v.round(MathContext.DECIMAL64).stripTrailingZeros().toPlainString());
    }

    private void press(String k) {
        try {
            if (k.matches("[0-9]")) {
                display.setText(fresh || display.getText().equals("0") ? k : display.getText() + k);
                fresh = false;
            } else if (k.equals(".")) {
                if (fresh) { display.setText("0."); fresh = false; }
                else if (!display.getText().contains(".")) display.setText(display.getText() + ".");
            } else if (k.equals("C")) {
                acc = BigDecimal.ZERO; pendingOp = null; display.setText("0"); fresh = true;
            } else if (k.equals("±")) {
                show(cur().negate());
            } else if (k.equals("%")) {
                show(cur().divide(new BigDecimal(100)));
            } else if (k.equals("√")) {
                show(new BigDecimal(Math.sqrt(cur().doubleValue())));
                fresh = true;
            } else {
                BigDecimal v = cur();
                if (pendingOp != null && !fresh) {
                    switch (pendingOp) {
                        case "+": acc = acc.add(v); break;
                        case "-": acc = acc.subtract(v); break;
                        case "*": acc = acc.multiply(v); break;
                        case "/": acc = acc.divide(v, MathContext.DECIMAL64); break;
                        default: break;
                    }
                } else if (pendingOp == null || !fresh) {
                    acc = v;
                }
                show(acc);
                pendingOp = k.equals("=") ? null : k;
                fresh = true;
            }
        } catch (ArithmeticException ex) {
            display.setText("Error");
            acc = BigDecimal.ZERO; pendingOp = null; fresh = true;
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new Calc95().setVisible(true));
    }
}
