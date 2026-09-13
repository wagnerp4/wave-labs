src: ../../
ref: https://github.com/debpalash/VoiceStudio
repo: https://github.com/wagnerp4/wave-labs
name: wave-labs
version: 0.1.0
licence: AGPL-3.0
tree:
    - library
        - models
            - backends
                - huggingface, ollama
                - adaptor, router, mcp, marketplace
            - text/video/x -> audio
            - api
            - cloud storage
            - audio -> text/video/x
        - trainer
        - storage
    - voices
        - store + cloud + import
        - create, combine, read, capture and play, 
    - audiobooks
    - application 
        - linux, macOS, windows, github
    - competitors: elevenlabs, voicestudio
    