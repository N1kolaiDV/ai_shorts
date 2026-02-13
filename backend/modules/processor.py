import spacy

nlp = spacy.load("es_core_news_sm")

def extract_keywords(text):
    doc = nlp(text)
    # Solo sustantivos, máximo 1 palabra por keyword
    keywords = [token.text.lower() for token in doc 
                if token.pos_ in ["NOUN"] and not token.is_stop and len(token.text) > 3]
    
    # Si no hay nada, temas genéricos que siempre tienen video
    if not keywords: return ["naturaleza", "negocios", "tecnologia"]
    
    # Limpiamos duplicados y limitamos a 6
    return list(dict.fromkeys(keywords))[:6]