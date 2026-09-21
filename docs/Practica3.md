# Generación de Skill API REST
> Pre-requisitos: tener instalado [OpenCode](https://opencode.ai/) y [cURL](https://curl.se/windows/) (Ref: https://curl.se/docs/faq.html#install).

1. Abrir OpenCode (en powershell, necesario para utilizar `curl`)
2. Instruir al agente para generar una skill en este proyecto para interactuar de forma efectiva con la API definida en [argentina_datos_api.yaml](./Practica3/argentina_datos_api.yaml) utilizando curl. Agregar la aclaración de que se debe utilizar solo la documentación.
    > Si no se aclara que se tiene que basar solo en el documento el agente puede evaluar que necesita explorar la API interactuando con la misma.
3. Revisar las descripciones de los path disponibles en la definicion de la API y elaborar 2 preguntas para probar la skill generada.
4. Reiniciar OpenCode y, en una sesión nueva (vacía), instruir al agente con las preguntas que elaboraste.
