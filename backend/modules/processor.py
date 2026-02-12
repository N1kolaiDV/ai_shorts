import spacy

# Cargamos el modelo en español
nlp = spacy.load("es_core_news_sm")

def extract_keywords(text):
    doc = nlp(text)
    # Solo queremos sustantivos que no sean palabras comunes/abstractas
    # Y añadimos un filtro de longitud para evitar "yo", "tu", "el"
    blacklist = ["forma", "manera", "cosa", "día", "hoy", "parte"]
    
    keywords = [token.text.lower() for token in doc 
                if token.pos_ in ["NOUN", "PROPN"] 
                and not token.is_stop 
                and token.text.lower() not in blacklist]

    # Si no hay suficientes, añadimos temas genéricos pero visuales
    if len(keywords) < 2:
        keywords += ["technology", "dark aesthetic"]
        
    return list(set(keywords))[:4]

# Prueba rápida
if __name__ == "__main__":
    test_text = "El robot está programando una aplicación en su computadora."
    print(f"Keywords detectadas: {extract_keywords(test_text)}")