# 📧 Configuración de Notificaciones por Correo (Trigger Email from Firestore)

Este proyecto utiliza la extensión oficial de Firebase **Trigger Email from Firestore** para enviar notificaciones automáticas por correo electrónico.

## 🚀 ¿Cómo funciona?

1. **Frontend:** Cuando un usuario crea un nuevo ticket a través del formulario en la web, el archivo `script.js` guarda el ticket en *Realtime Database* (como siempre) pero además **inserta un nuevo documento** en una colección llamada `mail` dentro de *Cloud Firestore*.
2. **Extensión en la Nube:** La extensión "Trigger Email" está permanentemente "escuchando" la colección `mail`.
3. **Envío:** En el momento en que detecta un nuevo documento en esa colección, lee su contenido (destinatario `to`, asunto `subject`, y cuerpo `html`) y utiliza un servidor SMTP para enviar el correo automáticamente.
4. **Estado:** La extensión actualiza el documento en Firestore con el estado de entrega (por ejemplo: `SUCCESS` o `ERROR`).

---

## ⚙️ ¿Cómo configurar las variables (SMTP)?

Como la extensión ya está instalada en tu proyecto de Google Cloud / Firebase (`amani-160bf`), solo necesitas asegurarte de que las variables de entorno de la extensión tengan los datos de tu servidor de correo.

Sigue estos pasos para configurarlas:

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Selecciona tu proyecto (`amani-160bf`).
3. En el menú lateral izquierdo, haz clic en **Build** (Compilación) > **Extensions** (Extensiones).
4. Verás la extensión instalada llamada **Trigger Email from Firestore**. Haz clic en el botón **Configurar** o **Manage** (Administrar).
5. En la pestaña de configuración, busca la sección de **Parámetros de la extensión**.

Aquí debes rellenar los datos de tu servidor de correos (SMTP):

### Parámetros Principales a Configurar:

- **SMTP connection URI:**  
  La cadena de conexión de tu proveedor de correo.  
  *Ejemplo para Gmail:* `smtps://tu_correo@gmail.com:tu_contraseña_de_aplicacion@smtp.gmail.com:465`  
  *(Importante: Si usas Gmail, no uses tu contraseña normal. Debes ir a la seguridad de tu cuenta de Google y generar una "Contraseña de aplicación").*

- **Email documents collection:**  
  Debe estar configurado exactamente como: `mail` (en minúsculas), ya que así está programado en el código frontend.

- **Default FROM address:**  
  El nombre y correo que aparecerá como remitente.  
  *Ejemplo:* `Soporte Amani <tu_correo@gmail.com>`

- **Default REPLY-TO address:** (Opcional)  
  El correo al que los usuarios responderán si hacen clic en "Responder".

---

## 🛠️ ¿Cómo probar que funciona?

1. Asegúrate de haber guardado la configuración en la Consola de Firebase.
2. Abre la aplicación web de soporte.
3. Crea un nuevo ticket usando un correo electrónico tuyo válido en el campo "Email".
4. Revisa la bandeja de entrada del correo que introdujiste. Deberías recibir un correo con el asunto "Ticket Creado Exitosamente...".
5. **(Opcional para depurar):** Si el correo no llega, puedes ir a la [Consola de Firestore](https://console.firebase.google.com/project/_/firestore), abrir la colección `mail`, seleccionar el documento recién creado y verificar el campo `delivery.state`. Si dice `ERROR`, verás el motivo exacto en el campo `delivery.error` (generalmente problemas con la contraseña o la URI del SMTP).
