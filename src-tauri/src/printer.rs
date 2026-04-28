use std::process::Command;
use std::fs;
use chrono::Local;

#[derive(Clone)]
pub struct OrderReceipt {
    pub numero: i32,
    pub cliente: String,
    pub items: String,
    pub total: f64,
    pub zona: String,
    pub hora: String,
    pub metodo_pago: String,
}

pub fn print_order(order: OrderReceipt, port_name: &str) -> Result<(), String> {
    print_order_using_shell(order, port_name)
}

pub fn get_available_ports() -> Result<Vec<String>, String> {
    // Get list of available printers from CUPS
    let output = Command::new("lpstat")
        .arg("-p")
        .output()
        .map_err(|e| format!("Error detectando impresoras: {}", e))?;

    if !output.status.success() {
        eprintln!("lpstat falló, usando POS80 por defecto");
        return Ok(vec!["POS80".to_string()]);
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let mut printers = Vec::new();

    // Parse printer names from lpstat output
    // Format is: "printer POS80 is idle.  enabled since..."
    for line in output_str.lines() {
        if line.contains("printer") && line.contains("is ") {
            // Extract printer name (second word)
            if let Some(name) = line.split_whitespace().nth(1) {
                printers.push(name.to_string());
                eprintln!("Impresora detectada: {}", name);
            }
        }
    }

    // Si no encontramos impresoras, asumimos POS80
    if printers.is_empty() {
        eprintln!("No se detectaron impresoras, usando POS80 por defecto");
        printers.push("POS80".to_string());
    }

    Ok(printers)
}

fn format_price(price: f64) -> String {
    // Format price with . for thousands and , for decimals
    // Example: 24000.50 -> "24.000,50"
    let total_cents = (price * 100.0).round() as i64;
    let pesos = total_cents / 100;
    let centavos = total_cents % 100;

    // Format pesos with thousands separator
    let pesos_str = pesos.to_string();
    let mut formatted = String::new();
    let len = pesos_str.len();

    for (i, c) in pesos_str.chars().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            formatted.push('.');
        }
        formatted.push(c);
    }

    // Add centavos with comma separator
    format!("{},{:02}", formatted, centavos)
}

fn print_order_using_shell(order: OrderReceipt, _port_name: &str) -> Result<(), String> {
    // Get current date and format as DD/MM/YYYY
    let now = Local::now();
    let fecha_formatted = now.format("%d/%m/%Y").to_string();

    // Parse hora to extract HH:MM
    let hora_formatted = if order.hora.len() >= 5 {
        &order.hora[0..5]  // Extract HH:MM from HH:MM:SS
    } else {
        &order.hora
    };

    // Format total price with proper locale
    let total_formatted = format_price(order.total);

    // Truncate dirección if too long (thermal printer width ~32-40 chars)
    let dir_truncated = if order.zona.len() > 36 {
        &order.zona[0..36]
    } else {
        &order.zona
    };

    // Build receipt - SIMPLE TEXT ONLY (no ESC/POS commands)
    // Format optimized for 58mm thermal printer (~32 chars width)
    let receipt = format!(
        "Oh My Dog\nOrden: #{:02}\nFecha: {}\nHora: {}\n----------\n{}\n----------\nTotal: ${}\nPago: {}\nDIR: {}\n\n\n\n\n",
        order.numero,
        fecha_formatted,
        hora_formatted,
        order.items,
        total_formatted,
        order.metodo_pago,
        dir_truncated
    );

    // Crear archivo temporal
    let tmp_path = "/tmp/panchis_receipt.txt";
    fs::write(tmp_path, &receipt)
        .map_err(|e| format!("Error writing temp file: {}", e))?;

    // Usar lp para enviar a la impresora CUPS POS80
    let output = Command::new("lp")
        .arg("-d").arg("POS80")
        .arg(tmp_path)
        .output()
        .map_err(|e| format!("Error ejecutando lp: {}", e))?;

    // Limpiar archivo temporal
    let _ = fs::remove_file(tmp_path);

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Printer error: {}", err_msg));
    }

    eprintln!("✓ Impresión enviada a POS80");
    Ok(())
}
