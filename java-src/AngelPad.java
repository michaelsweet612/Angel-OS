/*
 * SPDX-License-Identifier: LicenseRef-AngelOS-Personal-Use
 * AngelPad — Swing text editor bundled with Angel-OS (runs on the CheerpJ JVM).
 * Files are saved inside the JVM's persistent /files/ storage (IndexedDB).
 */
import javax.swing.*;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class AngelPad extends JFrame {
    private final JTextArea area = new JTextArea();
    private final JLabel status = new JLabel(" ");
    private final File file = new File("/files/AngelPad.txt");

    public AngelPad() {
        super("AngelPad (Java)");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        area.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 14));
        area.setLineWrap(true);
        area.setWrapStyleWord(true);

        JMenuBar bar = new JMenuBar();
        JMenu fileMenu = new JMenu("File");
        JMenuItem save = new JMenuItem("Save to /files/AngelPad.txt");
        save.addActionListener(e -> save());
        JMenuItem open = new JMenuItem("Reload");
        open.addActionListener(e -> load());
        JMenuItem clear = new JMenuItem("New");
        clear.addActionListener(e -> area.setText(""));
        fileMenu.add(clear);
        fileMenu.add(open);
        fileMenu.add(save);
        JMenu tools = new JMenu("Tools");
        JMenuItem upper = new JMenuItem("UPPERCASE");
        upper.addActionListener(e -> area.setText(area.getText().toUpperCase()));
        JMenuItem rev = new JMenuItem("Reverse text");
        rev.addActionListener(e -> area.setText(new StringBuilder(area.getText()).reverse().toString()));
        tools.add(upper);
        tools.add(rev);
        bar.add(fileMenu);
        bar.add(tools);
        setJMenuBar(bar);

        area.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { updateStatus(); }
            public void removeUpdate(DocumentEvent e) { updateStatus(); }
            public void changedUpdate(DocumentEvent e) { updateStatus(); }
        });

        getContentPane().add(new JScrollPane(area), BorderLayout.CENTER);
        getContentPane().add(status, BorderLayout.SOUTH);
        setSize(520, 380);
        setLocationRelativeTo(null);
        load();
        if (area.getText().isEmpty()) {
            area.setText("Welcome to AngelPad, a real Java Swing program running inside Angel-OS.\n\nType here, then use File > Save.");
        }
    }

    private void updateStatus() {
        String t = area.getText();
        int words = t.trim().isEmpty() ? 0 : t.trim().split("\\s+").length;
        status.setText(" " + t.length() + " chars | " + words + " words | Java " + System.getProperty("java.version"));
    }

    private void save() {
        try (Writer w = new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.UTF_8)) {
            w.write(area.getText());
            status.setText(" Saved " + file.getPath());
        } catch (IOException ex) {
            status.setText(" Save failed: " + ex.getMessage());
        }
    }

    private void load() {
        if (!file.exists()) { updateStatus(); return; }
        try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
            area.setText(sb.toString());
        } catch (IOException ex) {
            status.setText(" Load failed: " + ex.getMessage());
        }
        updateStatus();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new AngelPad().setVisible(true));
    }
}
