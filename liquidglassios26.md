# Liquid Glass — Guida Completa per iOS 26+

> **Documento di riferimento** per implementare il design system Liquid Glass di Apple nei progetti iOS 26+.
> Contiene principi di design, API SwiftUI, API UIKit, gestione icone, accessibilità, performance e risorse ufficiali.
> Ogni sezione contiene **codice completo e spiegato** pronto all'uso.

---

## 1. Cos'è Liquid Glass

Liquid Glass è il nuovo **materiale di design** introdotto da Apple alla WWDC 2025 (9 giugno 2025). È l'aggiornamento visivo più significativo dalla transizione a iOS 7 nel 2013.

### Caratteristiche Fondamentali

- **Materiale traslucido e dinamico** che riflette e rifrange il contenuto circostante
- **Lensing**: piega e concentra la luce in tempo reale (diverso dal blur tradizionale che la disperde)
- **Materializzazione**: gli elementi appaiono modulando gradualmente la rifrazione della luce
- **Fluidità**: flessibilità simile a gel con risposta immediata al tocco
- **Morphing**: trasformazione dinamica tra stati diversi dei controlli
- **Adattività**: composizione multi-layer che si adatta a contenuto, color scheme e dimensioni
- **Highlight speculari** che rispondono al movimento del dispositivo
- **Ombre adattive** e comportamenti interattivi

### Piattaforme Supportate

Liquid Glass è **unificato** su tutte le piattaforme Apple:
- iOS 26, iPadOS 26, macOS Tahoe (26), watchOS 26, tvOS 26, visionOS 26

### Dispositivi Compatibili (iOS 26)

- iPhone 11 o successivi
- iPhone SE (2ª generazione) o successivi

### Requisiti di Sviluppo

- **Xcode 26.0+**
- **iOS 26.0+ SDK**
- Swift / SwiftUI / UIKit / AppKit

---

## 2. Filosofia di Design — I 3 Principi HIG

### 2.1 Hierarchy (Gerarchia)

> "Stabilire una chiara gerarchia visiva dove controlli ed elementi dell'interfaccia elevino e distinguano il contenuto sottostante."

- I controlli Liquid Glass **fluttuano sopra il contenuto** come un livello funzionale distinto
- Il contenuto rimane primario; i controlli forniscono un overlay funzionale
- L'importanza dell'interfaccia viene comunicata attraverso livelli di trasparenza, rifrazione e peso visivo

### 2.2 Harmony (Armonia)

> "Allinearsi con il design concentrico di hardware e software per creare armonia tra elementi dell'interfaccia, esperienze di sistema e dispositivi."

- Le forme seguono l'hardware (angoli arrotondati concentrici)
- Il design bilancia hardware, contenuto e controlli

### 2.3 Consistency (Coerenza)

- Design universale cross-platform per la prima volta
- Mantiene caratteristiche specifiche della piattaforma condividendo i principi di design core

### Dove Usare Liquid Glass

✅ **SÌ** — Livello navigazione: toolbar, navigation bars, tab bars, bottoni, controlli, sidebar fluttuanti, sheet e popover

❌ **NO** — Contenuto diretto: liste, tabelle, media, immagini, testo del contenuto principale

> **Regola d'oro Apple**: "Liquid Glass è riservato al livello di navigazione che fluttua sopra il contenuto della tua app."

---

## 3. SwiftUI — Basi

### 3.1 Il Modifier `.glassEffect()` — Firma API

```swift
// Firma completa dell'API
// - glass: il tipo di materiale glass (.regular, .clear, .identity)
// - shape: la forma del glass (default: capsule)
// - isEnabled: toggle per abilitare/disabilitare l'effetto
func glassEffect<S: Shape>(
    _ glass: Glass = .regular,
    in shape: S = DefaultGlassEffectShape,
    isEnabled: Bool = true
) -> some View
```

### 3.2 Hello World — Primo Effetto Glass

```swift
import SwiftUI

struct BasicGlassView: View {
    var body: some View {
        // Il modo più semplice per applicare Liquid Glass
        // Risultato: testo con sfondo glass a forma di capsula
        Text("Hello, Liquid Glass!")
            .padding()        // Padding interno per dare spazio al glass
            .glassEffect()    // Default: variante .regular, forma .capsule
    }
}
```

### 3.3 Parametri Espliciti

```swift
struct ExplicitGlassView: View {
    @State private var isGlassOn = true
    
    var body: some View {
        VStack(spacing: 20) {
            // Glass con tutti i parametri espliciti
            Text("Regular Glass")
                .padding()
                .glassEffect(
                    .regular,           // Variante: trasparenza media, adattività completa
                    in: .capsule,       // Forma: capsula (default)
                    isEnabled: true     // Attivo: sì
                )
            
            // Glass con toggle dinamico via isEnabled
            // Quando isGlassOn è false, il glass sparisce senza ricalcolare il layout
            Text("Toggleable Glass")
                .padding()
                .glassEffect(.regular, in: .capsule, isEnabled: isGlassOn)
            
            Button("Toggle Glass") {
                withAnimation {
                    isGlassOn.toggle()
                }
            }
        }
    }
}
```

---

## 4. Varianti Glass

Il tipo `Glass` espone tre varianti statiche e due modifier:

```swift
struct Glass {
    static var regular: Glass   // Default: trasparenza media, si adatta a qualsiasi contenuto
    static var clear: Glass     // Alta trasparenza, per sfondi media-rich (foto, video, mappe)
    static var identity: Glass  // Nessun effetto applicato (utile per toggle condizionali)
    
    func tint(_ color: Color) -> Glass       // Aggiunge tinta colorata semantica
    func interactive() -> Glass              // Abilita scaling, bounce e shimmer al tocco
}
```

| Variante    | Uso                              | Trasparenza | Adattività                       |
|-------------|----------------------------------|-------------|----------------------------------|
| `.regular`  | Default per la maggior parte UI  | Media       | Completa, si adatta a tutto      |
| `.clear`    | Sfondi media-rich                | Alta        | Limitata, richiede dimming layer |
| `.identity` | Disabilitazione condizionale     | Nessuna     | N/A                              |

### 4.1 Esempio Completo — Tutte le Varianti

```swift
struct GlassVariantsDemo: View {
    var body: some View {
        ZStack {
            // Sfondo con immagine per mostrare la trasparenza
            Image("landscape")
                .resizable()
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // REGULAR: la scelta standard per toolbar, bottoni, nav bar
                // Trasparenza media — si adatta automaticamente a qualsiasi sfondo
                Text("Regular Glass")
                    .padding()
                    .glassEffect(.regular)
                
                // CLEAR: per controlli fluttuanti sopra foto/video/mappe
                // Più trasparente — il contenuto dietro è più visibile
                // REQUISITI per usare .clear:
                // 1. L'elemento è sopra contenuto media-rich
                // 2. Il contenuto non è impattato negativamente dal dimming
                // 3. Il contenuto sopra il glass è bold e luminoso
                Text("Clear Glass")
                    .font(.headline)               // Font bold per leggibilità
                    .foregroundStyle(.white)        // Colore chiaro per contrasto
                    .padding()
                    .glassEffect(.clear)
                
                // IDENTITY: nessun effetto — utile per toggle condizionali
                // Il layout NON cambia, il glass semplicemente non viene renderizzato
                Text("Identity (no glass)")
                    .padding()
                    .glassEffect(.identity)
            }
        }
    }
}
```

### 4.2 Toggle Condizionale con .identity

```swift
struct ConditionalGlassView: View {
    @State private var showGlass = true
    
    var body: some View {
        VStack {
            // Usando .identity per il toggle, NON c'è ricalcolo del layout
            // Questo è molto più efficiente di un if/else che
            // aggiungerebbe/rimuoverebbe il modifier
            Text("Conditional Effect")
                .padding()
                .glassEffect(showGlass ? .regular : .identity)
            
            Toggle("Glass Effect", isOn: $showGlass)
                .padding()
        }
    }
}
```

---

## 5. Tinting e Interactive

### 5.1 Tinting — Dare Significato Semantico

Il tinting va usato per **comunicare significato** (azione primaria, stato), **NON** come decorazione. Usare selettivamente solo per call-to-action.

```swift
struct TintingExamples: View {
    var body: some View {
        VStack(spacing: 16) {
            // Tinta base — colore pieno
            // Il sistema adatta automaticamente il colore per mantenere
            // la leggibilità su qualsiasi sfondo (trattamento "vibrant")
            Text("Primary Action")
                .padding()
                .glassEffect(.regular.tint(.blue))
            
            // Tinta con opacità — effetto più sottile e see-through
            // Utile quando si vuole suggerire un colore senza dominare
            Text("Secondary Action")
                .padding()
                .glassEffect(.regular.tint(.purple.opacity(0.6)))
            
            // Tinta rossa per azioni distruttive
            Text("Delete")
                .padding()
                .glassEffect(.regular.tint(.red.opacity(0.7)))
            
            // Tinta verde per conferma/successo
            Text("Confirm")
                .padding()
                .glassEffect(.regular.tint(.green))
        }
    }
}
```

### 5.2 Interactive — Effetti al Tocco (Solo iOS)

Il modifier `.interactive()` abilita:
- **Scaling** al press (ingrandimento leggero)
- **Bouncing** animation (rimbalzo elastico)
- **Shimmering** effect (luccichio)
- **Touch-point illumination** che si irradia al glass vicino

```swift
struct InteractiveGlassDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            // Bottone con interattività glass
            // Quando l'utente preme, il glass scala, rimbalza e brilla
            Button("Interactive Button") {
                print("Tapped!")
            }
            .padding()
            .glassEffect(.regular.interactive())
            
            // Method chaining — l'ORDINE NON IMPORTA
            // Entrambe le seguenti righe producono lo stesso risultato
            Button("Tinted + Interactive") {
                print("Tapped!")
            }
            .padding()
            .glassEffect(.regular.tint(.orange).interactive())
            // equivalente a: .glassEffect(.regular.interactive().tint(.orange))
            
            // Clear variant + interactive + tint
            // Perfetto per controlli fluttuanti su foto/video
            Button(action: {}) {
                Image(systemName: "camera.fill")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
            }
            .glassEffect(.clear.interactive().tint(.blue))
        }
    }
}
```

---

## 6. Forme Personalizzate

```swift
struct CustomShapesDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            // CAPSULE — forma default, la più comune
            Text("Capsule")
                .padding()
                .glassEffect(.regular, in: .capsule)
            
            // CIRCLE — perfetto per bottoni icona
            Image(systemName: "plus")
                .font(.title)
                .frame(width: 56, height: 56)
                .glassEffect(.regular, in: .circle)
            
            // ROUNDED RECTANGLE — per card e pannelli
            Text("Rounded Rectangle")
                .frame(width: 200, height: 80)
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
            
            // CONTAINER CONCENTRIC — gli angoli si allineano automaticamente
            // con quelli del container/finestra/dispositivo
            // Questo è il modo raccomandato per avere angoli "che si sentono giusti"
            Text("Concentric Corners")
                .frame(width: 200, height: 80)
                .glassEffect(.regular, in: .rect(cornerRadius: .containerConcentric))
            
            // ELLIPSE — forma ovale
            Text("Ellipse")
                .frame(width: 180, height: 60)
                .glassEffect(.regular, in: .ellipse)
        }
    }
}
```

### 6.1 Forme Completamente Custom

```swift
// Qualsiasi tipo che conforma al protocollo Shape può essere usato
struct StarShape: Shape {
    func path(in rect: CGRect) -> Path {
        // Crea un path a forma di stella
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let outerRadius = min(rect.width, rect.height) / 2
        let innerRadius = outerRadius * 0.4
        let points = 5
        
        var path = Path()
        for i in 0..<(points * 2) {
            let radius = i.isMultiple(of: 2) ? outerRadius : innerRadius
            let angle = Double(i) * .pi / Double(points) - .pi / 2
            let point = CGPoint(
                x: center.x + CGFloat(cos(angle)) * radius,
                y: center.y + CGFloat(sin(angle)) * radius
            )
            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()
        return path
    }
}

// Uso della forma custom
struct CustomShapeGlass: View {
    var body: some View {
        Image(systemName: "star.fill")
            .font(.largeTitle)
            .foregroundStyle(.yellow)
            .frame(width: 100, height: 100)
            .glassEffect(.regular, in: StarShape())
    }
}
```

### 6.2 Corner Concentricity

```swift
// La concentricità automatica degli angoli mantiene
// perfetto allineamento tra elementi e container su tutti i dispositivi
struct ConcentricCornersDemo: View {
    var body: some View {
        // Il container esterno
        RoundedRectangle(cornerRadius: 24)
            .fill(.ultraThinMaterial)
            .frame(width: 300, height: 200)
            .overlay {
                // L'elemento interno usa .containerConcentric
                // I suoi angoli si adattano AUTOMATICAMENTE per essere
                // concentrici con quelli del container
                Text("Inner Element")
                    .padding()
                    .frame(width: 260, height: 160)
                    .glassEffect(
                        .regular,
                        in: RoundedRectangle(
                            cornerRadius: .containerConcentric,
                            style: .continuous
                        )
                    )
            }
    }
}
```

---

## 7. Button Styles Glass

### 7.1 I Due Stili

| Stile               | Aspetto                     | Uso                |
|----------------------|-----------------------------|--------------------|
| `.glass`             | Traslucido, see-through     | Azioni secondarie  |
| `.glassProminent`    | Opaco, senza see-through    | Azioni primarie    |

```swift
struct GlassButtonStylesDemo: View {
    var body: some View {
        VStack(spacing: 24) {
            // GLASS — Stile traslucido per azioni secondarie
            // Lo sfondo è parzialmente visibile attraverso il bottone
            Button("Cancel") {
                print("Cancel tapped")
            }
            .buttonStyle(.glass)
            
            // GLASS PROMINENT — Stile opaco per azioni primarie
            // Lo sfondo NON è visibile — attira l'attenzione dell'utente
            // Usa .tint() per il colore semantico
            Button("Save") {
                print("Save tapped")
            }
            .buttonStyle(.glassProminent)
            .tint(.blue)
            
            // Bottone con personalizzazione completa
            Button("Delete Account") {
                print("Delete tapped")
            }
            .buttonStyle(.glass)
            .tint(.red)                          // Colore semantico: pericolo
            .controlSize(.large)                 // Dimensione grande
            .buttonBorderShape(.capsule)         // Forma capsula
        }
    }
}
```

### 7.2 Control Sizes e Border Shapes

```swift
struct ButtonSizesDemo: View {
    var body: some View {
        VStack(spacing: 16) {
            // TUTTE LE DIMENSIONI DISPONIBILI
            Button("Mini") { }
                .buttonStyle(.glass)
                .controlSize(.mini)          // Più piccolo possibile
            
            Button("Small") { }
                .buttonStyle(.glass)
                .controlSize(.small)         // Piccolo
            
            Button("Regular") { }
                .buttonStyle(.glass)
                .controlSize(.regular)       // Default
            
            Button("Large") { }
                .buttonStyle(.glass)
                .controlSize(.large)         // Grande
            
            Button("Extra Large") { }
                .buttonStyle(.glass)
                .controlSize(.extraLarge)    // Nuovo in iOS 26 — il più grande
            
            // TUTTE LE FORME BORDO DISPONIBILI
            HStack(spacing: 12) {
                Button("Capsule") { }
                    .buttonStyle(.glass)
                    .buttonBorderShape(.capsule)                     // Capsula (default)
                
                Button("Rounded") { }
                    .buttonStyle(.glass)
                    .buttonBorderShape(.roundedRectangle(radius: 8)) // Rettangolo arrotondato
                
                // Per bottoni icona circolari
                Button(action: {}) {
                    Image(systemName: "plus")
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)                          // Cerchio
            }
        }
    }
}
```

### 7.3 Bottoni Icona Glass — Pattern Completo

```swift
struct GlassIconButtons: View {
    @State private var isLiked = false
    @State private var isSaved = false
    
    var body: some View {
        HStack(spacing: 16) {
            // Bottone icona con toggle stato + symbol transition
            Button {
                isLiked.toggle()
            } label: {
                Image(systemName: isLiked ? "heart.fill" : "heart")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .tint(isLiked ? .red : nil)
            // contentTransition crea un'animazione fluida quando il simbolo cambia
            .contentTransition(.symbolEffect(.replace))
            
            // Bottone con animazione simbolo
            Button {
                isSaved.toggle()
            } label: {
                Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .tint(isSaved ? .yellow : nil)
            .contentTransition(.symbolEffect(.replace))
            
            // Bottone share — senza toggle
            Button {
                // share action
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
        }
    }
}
```

---

## 8. GlassEffectContainer

### 8.1 Perché è Necessario

**Regola critica**: il glass **non può campionare altro glass**. Senza un container, ogni glass campiona indipendentemente lo sfondo, causando inconsistenze visive. Il `GlassEffectContainer`:
- Combina più glass in una composizione unificata
- Migliora performance condividendo la regione di campionamento
- Abilita transizioni morphing tra gli elementi

```swift
// Firma API
struct GlassEffectContainer<Content: View>: View {
    init(spacing: CGFloat? = nil, @ViewBuilder content: () -> Content)
}
```

### 8.2 Esempio Base

```swift
struct BasicContainerDemo: View {
    var body: some View {
        // ✅ CORRETTO: tutti gli elementi glass in un container condiviso
        // Il rendering è efficiente e consistente
        GlassEffectContainer {
            HStack(spacing: 20) {
                Image(systemName: "pencil")
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive())
                
                Image(systemName: "eraser")
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive())
                
                Image(systemName: "lasso")
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive())
            }
        }
        
        // ❌ ERRATO: glass elements SENZA container
        // Rendering inefficiente, campionamento inconsistente,
        // nessun morphing possibile
        // HStack(spacing: 20) {
        //     Image(systemName: "pencil").glassEffect()
        //     Image(systemName: "eraser").glassEffect()
        // }
    }
}
```

### 8.3 Container con Spacing — Controllo del Morphing

Il parametro `spacing` controlla **a quale distanza gli elementi si fondono visivamente** (come gocce d'acqua).

```swift
struct SpacingContainerDemo: View {
    var body: some View {
        VStack(spacing: 40) {
            // Spacing PICCOLO: gli elementi si fondono facilmente
            Text("Spacing: 20pt")
                .font(.caption)
            GlassEffectContainer(spacing: 20) {
                HStack(spacing: 15) {
                    ForEach(0..<3, id: \.self) { _ in
                        Circle()
                            .frame(width: 44, height: 44)
                            .glassEffect()
                    }
                }
            }
            
            // Spacing GRANDE: gli elementi restano separati
            Text("Spacing: 60pt")
                .font(.caption)
            GlassEffectContainer(spacing: 60) {
                HStack(spacing: 15) {
                    ForEach(0..<3, id: \.self) { _ in
                        Circle()
                            .frame(width: 44, height: 44)
                            .glassEffect()
                    }
                }
            }
        }
    }
}
```

---

## 9. Morphing — glassEffectID

Il morphing è la trasformazione fluida tra stati diversi degli elementi glass.

**Requisiti:**
1. Elementi nello stesso `GlassEffectContainer`
2. Ogni view ha `glassEffectID` con **namespace condiviso**
3. View mostrate/nascoste condizionalmente triggerano il morphing
4. Animazione applicata ai cambi di stato (es. `withAnimation`)

### 9.1 Esempio Base — Expand/Collapse

```swift
struct BasicMorphingDemo: View {
    @State private var isExpanded = false
    // Il Namespace collega gli ID glass tra diversi stati
    @Namespace private var namespace
    
    var body: some View {
        GlassEffectContainer(spacing: 30) {
            VStack(spacing: 16) {
                // Bottone principale — SEMPRE visibile
                // Quando isExpanded cambia, questo bottone morpha fluidamente
                Button {
                    // .bouncy crea un'animazione elastica perfetta per il morphing
                    withAnimation(.bouncy) {
                        isExpanded.toggle()
                    }
                } label: {
                    Label(
                        isExpanded ? "Close" : "Options",
                        systemImage: isExpanded ? "xmark" : "ellipsis"
                    )
                    .frame(width: 120, height: 44)
                }
                .buttonStyle(.glass)
                // L'ID "toggle" permette al sistema di tracciare questo
                // elemento durante il morphing
                .glassEffectID("toggle", in: namespace)
                
                // Azioni aggiuntive — visibili solo quando espanso
                // Appaiono morphando DAL bottone principale
                if isExpanded {
                    Button("Edit") { }
                        .buttonStyle(.glass)
                        .glassEffectID("edit", in: namespace)
                    
                    Button("Share") { }
                        .buttonStyle(.glass)
                        .glassEffectID("share", in: namespace)
                    
                    Button("Delete") { }
                        .buttonStyle(.glass)
                        .tint(.red)
                        .glassEffectID("delete", in: namespace)
                }
            }
        }
    }
}
```

### 9.2 Menu a Croce Espandibile — Pattern Avanzato

```swift
struct CrossMenuDemo: View {
    @State private var showActions = false
    @Namespace private var namespace
    
    var body: some View {
        ZStack {
            // Sfondo necessario per vedere la trasparenza del glass
            Image("background")
                .resizable()
                .ignoresSafeArea()
            
            // Il container abilita il morphing tra tutti i bottoni
            GlassEffectContainer(spacing: 30) {
                VStack(spacing: 30) {
                    // SOPRA — Appare quando espanso
                    if showActions {
                        actionButton("rotate.right", color: .purple)
                            .glassEffectID("rotate", in: namespace)
                    }
                    
                    HStack(spacing: 30) {
                        // SINISTRA
                        if showActions {
                            actionButton("circle.lefthalf.filled", color: .blue)
                                .glassEffectID("contrast", in: namespace)
                        }
                        
                        // CENTRO — Toggle, sempre visibile
                        actionButton(
                            showActions ? "xmark" : "slider.horizontal.3",
                            color: .primary
                        ) {
                            withAnimation(.bouncy) {
                                showActions.toggle()
                            }
                        }
                        .glassEffectID("toggle", in: namespace)
                        
                        // DESTRA
                        if showActions {
                            actionButton("flip.horizontal", color: .green)
                                .glassEffectID("flip", in: namespace)
                        }
                    }
                    
                    // SOTTO
                    if showActions {
                        actionButton("crop", color: .orange)
                            .glassEffectID("crop", in: namespace)
                    }
                }
            }
        }
    }
    
    // Helper per creare bottoni icona glass uniformi
    @ViewBuilder
    func actionButton(
        _ systemImage: String,
        color: Color = .primary,
        action: (() -> Void)? = nil
    ) -> some View {
        Button {
            action?()
        } label: {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 50, height: 50)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
    }
}
```

### 9.3 Floating Action Button (FAB) Espandibile

```swift
struct FloatingActionCluster: View {
    @State private var isExpanded = false
    @Namespace private var namespace
    
    // Definizione azioni con icona e colore
    let actions: [(icon: String, color: Color, label: String)] = [
        ("house", .purple, "Home"),
        ("pencil", .blue, "Edit"),
        ("message", .green, "Message"),
        ("envelope", .orange, "Mail")
    ]
    
    var body: some View {
        ZStack {
            // Il tuo contenuto principale
            Color(.systemBackground).ignoresSafeArea()
            
            // FAB posizionato in basso a destra
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    fabCluster
                        .padding(24)
                }
            }
        }
    }
    
    var fabCluster: some View {
        GlassEffectContainer(spacing: 20) {
            VStack(spacing: 12) {
                // Le azioni secondarie appaiono sopra il FAB principale
                if isExpanded {
                    ForEach(actions, id: \.icon) { action in
                        Button {
                            print("\(action.label) tapped")
                            withAnimation(.bouncy(duration: 0.4)) {
                                isExpanded = false
                            }
                        } label: {
                            Image(systemName: action.icon)
                                .font(.title3)
                                .frame(width: 48, height: 48)
                        }
                        .buttonStyle(.glass)
                        .buttonBorderShape(.circle)
                        .tint(action.color)
                        .glassEffectID(action.icon, in: namespace)
                    }
                }
                
                // FAB principale — sempre visibile
                Button {
                    withAnimation(.bouncy(duration: 0.4)) {
                        isExpanded.toggle()
                    }
                } label: {
                    Image(systemName: isExpanded ? "xmark" : "plus")
                        .font(.title2.bold())
                        .frame(width: 56, height: 56)
                }
                .buttonStyle(.glassProminent)  // Prominent = azione primaria
                .buttonBorderShape(.circle)
                .tint(.blue)
                .glassEffectID("fab-toggle", in: namespace)
            }
        }
    }
}
```

---

## 10. glassEffectUnion e glassEffectTransition

### 10.1 Union — Merge Manuale di Glass Distanti

Per combinare glass troppo distanti per fondersi tramite il `spacing` del container.

```swift
struct UnionDemo: View {
    @Namespace var controls
    
    var body: some View {
        GlassEffectContainer {
            VStack(spacing: 0) {
                Button("Edit") { }
                    .buttonStyle(.glass)
                    .glassEffectUnion(id: "tools", namespace: controls)
                
                Spacer().frame(height: 100) // Gap grande
                
                Button("Delete") { }
                    .buttonStyle(.glass)
                    .glassEffectUnion(id: "tools", namespace: controls)
                // Anche con 100pt di gap, i due bottoni sono visivamente
                // un unico "blob" di glass grazie alla union
            }
        }
    }
}
```

**Raggruppamento selettivo:**

```swift
struct GroupedUnionDemo: View {
    @Namespace var glassNamespace
    let icons = ["pencil", "eraser", "lasso", "scissors"]
    
    var body: some View {
        GlassEffectContainer {
            HStack(spacing: 16) {
                ForEach(0..<4, id: \.self) { index in
                    Image(systemName: icons[index])
                        .frame(width: 50, height: 50)
                        .glassEffect()
                        // I primi 3 formano un gruppo, il 4° è separato
                        .glassEffectUnion(
                            id: index < 3 ? "drawingTools" : "cutTool",
                            namespace: glassNamespace
                        )
                }
            }
        }
    }
}
```

### 10.2 Transition — Controllo Apparizione/Scomparsa

```swift
enum GlassEffectTransition {
    case identity         // Nessun cambiamento
    case matchedGeometry  // Transizione geometria matched (default)
    case materialize      // Effetto materializzazione (luce che si modula gradualmente)
}

struct TransitionDemo: View {
    @State private var showButton = false
    @Namespace private var namespace
    
    var body: some View {
        VStack {
            if showButton {
                // Il bottone appare con effetto di materializzazione
                // (la luce si piega gradualmente, come se il glass si formasse)
                Button("Materialized Button") { }
                    .buttonStyle(.glass)
                    .glassEffectID("button", in: namespace)
                    .glassEffectTransition(.materialize)
            }
            
            Button("Toggle") {
                withAnimation(.spring) {
                    showButton.toggle()
                }
            }
        }
    }
}
```

---

## 11. Toolbar con Liquid Glass

### 11.1 Automatico — Zero Codice

Le toolbar ricevono Liquid Glass automaticamente. Il sistema:
- Dà priorità ai simboli rispetto al testo
- Applica `.glassProminent` a `.confirmationAction`
- Raggruppa visivamente bottoni adiacenti

```swift
struct AutomaticToolbarDemo: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                ForEach(0..<50, id: \.self) { i in
                    Text("Item \(i)")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                }
            }
            .navigationTitle("My App")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", systemImage: "xmark") { }
                    // Riceve glass standard automaticamente
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", systemImage: "checkmark") { }
                    // Riceve AUTOMATICAMENTE .glassProminent
                }
            }
        }
    }
}
```

### 11.2 Toolbar Personalizzata

```swift
struct CustomToolbarDemo: View {
    var body: some View {
        NavigationStack {
            Text("Content")
                .toolbar {
                    // GRUPPO di strumenti — raggruppati visivamente
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button("Draw", systemImage: "pencil") { }
                        Button("Erase", systemImage: "eraser") { }
                    }
                    
                    // SPACER FISSO — nuovo in iOS 26
                    ToolbarSpacer(.fixed, spacing: 20)
                    
                    // Bottone singolo prominente separato dal gruppo
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Save", systemImage: "checkmark") { }
                            .buttonStyle(.glassProminent)
                    }
                    
                    // BADGE su icona
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Notifications", systemImage: "bell") { }
                            .badge(5)       // Badge rosso con numero
                            .tint(.red)
                    }
                    
                    // Nascondere sfondo glass condiviso per un item
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Profile", systemImage: "person.circle") { }
                            .sharedBackgroundVisibility(.hidden)
                    }
                }
        }
    }
}
```

---

## 12. TabView con Liquid Glass

### 12.1 Tab Base + Search Role + Minimizzazione + Accessory

```swift
struct CompleteTabViewDemo: View {
    @State private var searchText = ""
    
    var body: some View {
        TabView {
            // Tab normali
            Tab("Home", systemImage: "house") {
                NavigationStack {
                    ScrollView {
                        ForEach(0..<100, id: \.self) { i in
                            Text("Row \(i)").padding()
                        }
                    }
                    .navigationTitle("Home")
                }
            }
            
            Tab("Library", systemImage: "books.vertical") {
                LibraryView()
            }
            
            Tab("Profile", systemImage: "person") {
                ProfileView()
            }
            
            // SEARCH TAB ROLE — crea bottone floating in basso a destra
            // Ottimizzato per reachability (raggiungibilità con una mano)
            Tab("Search", systemImage: "magnifyingglass", role: .search) {
                NavigationStack {
                    SearchResultsView(query: searchText)
                }
            }
        }
        .searchable(text: $searchText)
        // Tab bar si MINIMIZZA durante scroll verso il basso
        // Si espande quando si scrolla verso l'alto
        .tabBarMinimizeBehavior(.onScrollDown)
        // BOTTOM ACCESSORY — view glass persistente SOPRA la tab bar
        .tabViewBottomAccessory {
            HStack {
                Image(systemName: "play.fill")
                    .font(.caption)
                Text("Now Playing: Song Title")
                    .font(.caption)
                    .lineLimit(1)
                Spacer()
                Button(action: {}) {
                    Image(systemName: "forward.fill")
                        .font(.caption)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }
}
```

### 12.2 Leggere lo Stato del Bottom Accessory

```swift
struct AccessoryAwareView: View {
    // Legge se il bottom accessory è espanso o collassato
    @Environment(\.tabViewBottomAccessoryPlacement) var placement
    
    var body: some View {
        VStack {
            Text("Accessory: \(placement == .expanded ? "Expanded" : "Collapsed")")
        }
    }
}
```

---

## 13. Sheet con Liquid Glass

### 13.1 Sheet con Morphing dalla Toolbar

```swift
struct SheetMorphingDemo: View {
    @Namespace private var transition
    @State private var showInfo = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                Text("Main Content").padding()
            }
            .toolbar {
                ToolbarItem(placement: .bottomBar) {
                    Button("Info", systemImage: "info.circle") {
                        showInfo = true
                    }
                    // Segna il bottone come SORGENTE della transizione
                    .matchedTransitionSource(id: "info", in: transition)
                }
            }
            .sheet(isPresented: $showInfo) {
                NavigationStack {
                    List {
                        Section("App Info") {
                            Text("Version 1.0")
                            Text("Build 42")
                        }
                    }
                    .navigationTitle("Info")
                }
                // La sheet morpha DAL bottone sorgente
                .navigationTransition(.zoom(sourceID: "info", in: transition))
                .presentationDetents([.medium, .large])
                // NON impostare .presentationBackground() su iOS 26
                // Il glass automatico è migliore
            }
        }
    }
}
```

### 13.2 Rimuovere Background per Glass

```swift
// Per Form e List dentro sheet
Form {
    Section("Settings") {
        Toggle("Notifications", isOn: .constant(true))
    }
}
.scrollContentBackground(.hidden)                     // Rimuovi sfondo Form
.containerBackground(.clear, for: .navigation)         // Rimuovi sfondo nav

// ❌ MAI su iOS 26:
// .presentationBackground(Color.white)  ← Blocca il glass automatico
```

---

## 14. NavigationSplitView e Search

```swift
struct SplitViewDemo: View {
    @State private var selectedItem: String?
    @State private var searchText = ""
    let items = ["Photos", "Videos", "Documents", "Downloads"]
    
    var body: some View {
        // La sidebar riceve AUTOMATICAMENTE Liquid Glass fluttuante
        NavigationSplitView {
            List(items, id: \.self, selection: $selectedItem) { item in
                NavigationLink(item, value: item)
            }
            .navigationTitle("Files")
            // Estende il glass oltre la safe area
            .backgroundExtensionEffect()
        } detail: {
            if let selectedItem {
                Text("Detail for \(selectedItem)")
            } else {
                Text("Select an item")
                    .foregroundStyle(.secondary)
            }
        }
    }
}
```

**Search minimizzata:**

```swift
NavigationStack {
    List { /* content */ }
}
.searchable(text: $searchText)
.searchToolbarBehavior(.minimized)  // Parte come icona, si espande al tap

// Oppure usa DefaultToolbarItem (nuovo API):
.toolbar {
    ToolbarItem(placement: .bottomBar) {
        DefaultToolbarItem(kind: .search, placement: .bottomBar)
    }
}
```

---

## 15. UIKit — Implementazione Completa

### 15.1 UIGlassEffect Base

`UIGlassEffect` è sottoclasse di `UIVisualEffect`. Si usa con `UIVisualEffectView`.

```swift
import UIKit

class GlassViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemTeal
        
        // 1. Creare il glass effect
        let glassEffect = UIGlassEffect()
        // Stili: UIGlassEffect(style: .regular) oppure .clear
        
        // 2. Personalizzare (opzionale)
        glassEffect.tintColor = UIColor.systemBlue.withAlphaComponent(0.3)
        glassEffect.isInteractive = true  // Scaling e bounce al tocco
        
        // 3. Creare la visual effect view
        let effectView = UIVisualEffectView(effect: glassEffect)
        effectView.frame = CGRect(x: 50, y: 100, width: 300, height: 200)
        effectView.layer.cornerRadius = 20
        effectView.clipsToBounds = true
        
        // 4. Aggiungere contenuto DENTRO contentView
        let label = UILabel()
        label.text = "Liquid Glass in UIKit"
        label.textAlignment = .center
        label.font = .preferredFont(forTextStyle: .headline)
        label.frame = effectView.bounds
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        effectView.contentView.addSubview(label)
        
        // 5. Aggiungere alla gerarchia
        view.addSubview(effectView)
    }
}
```

### 15.2 UIGlassContainerEffect — Morphing UIKit

```swift
class GlassContainerViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        
        // 1. Container con spacing per morphing
        let containerEffect = UIGlassContainerEffect()
        containerEffect.spacing = 40.0
        
        let containerView = UIVisualEffectView(effect: containerEffect)
        containerView.frame = CGRect(x: 20, y: 200, width: 340, height: 200)
        view.addSubview(containerView)
        
        // 2. Primo glass
        let firstGlass = UIGlassEffect()
        let firstView = UIVisualEffectView(effect: firstGlass)
        firstView.frame = CGRect(x: 30, y: 50, width: 100, height: 100)
        firstView.layer.cornerRadius = 20
        firstView.clipsToBounds = true
        
        // 3. Secondo glass con tinta
        let secondGlass = UIGlassEffect()
        secondGlass.tintColor = UIColor.systemPink.withAlphaComponent(0.3)
        let secondView = UIVisualEffectView(effect: secondGlass)
        secondView.frame = CGRect(x: 200, y: 50, width: 100, height: 100)
        secondView.layer.cornerRadius = 20
        secondView.clipsToBounds = true
        
        // 4. Aggiungere al contentView del CONTAINER
        containerView.contentView.addSubview(firstView)
        containerView.contentView.addSubview(secondView)
        // Quando animate vicine (entro 40pt), si fondono come gocce d'acqua
    }
}
```

### 15.3 Animazioni — Materializzazione

**REGOLA**: usare `effect = nil`/`effect = UIGlassEffect()` per animazioni, MAI `alpha`.

```swift
class AnimatedGlassVC: UIViewController {
    var glassView: UIVisualEffectView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        glassView = UIVisualEffectView(effect: nil) // Senza glass iniziale
        glassView.frame = CGRect(x: 50, y: 200, width: 300, height: 100)
        glassView.layer.cornerRadius = 20
        glassView.clipsToBounds = true
        view.addSubview(glassView)
    }
    
    // MATERIALIZZAZIONE — glass appare con animazione di luce
    func materialize() {
        UIView.animate(withDuration: 0.4) {
            self.glassView.effect = UIGlassEffect()
        }
    }
    
    // DEMATERIALIZZAZIONE — glass scompare sciogliendo la luce
    func dematerialize() {
        UIView.animate(withDuration: 0.4) {
            self.glassView.effect = nil
        }
    }
    
    // CAMBIO TINTA ANIMATO
    func changeTint(to color: UIColor) {
        let newGlass = UIGlassEffect()
        newGlass.tintColor = color
        UIView.animate(withDuration: 0.3) {
            self.glassView.effect = newGlass
        }
    }
    
    // ❌ MAI: UIView.animate { self.glassView.alpha = 0 }
    // NON produce la corretta animazione di dematerializzazione
}
```

### 15.4 Split e Merge Animati (Effetto Gocce d'Acqua)

```swift
func animateSplitMerge() {
    let containerEffect = UIGlassContainerEffect()
    let containerView = UIVisualEffectView(effect: containerEffect)
    containerView.frame = view.bounds
    view.addSubview(containerView)
    
    var glassViews: [UIVisualEffectView] = []
    let startFrame = CGRect(x: 150, y: 300, width: 80, height: 80)
    
    for _ in 0..<3 {
        let gv = UIVisualEffectView(effect: UIGlassEffect())
        gv.layer.cornerRadius = 20
        gv.clipsToBounds = true
        glassViews.append(gv)
    }
    
    // Posizionare tutte nello stesso punto SENZA animazione
    UIView.performWithoutAnimation {
        for gv in glassViews {
            containerView.contentView.addSubview(gv)
            gv.frame = startFrame
        }
    }
    
    // Animare la separazione — effetto "gocce d'acqua"
    UIView.animate(withDuration: 0.5, delay: 0.5,
                   usingSpringWithDamping: 0.7, initialSpringVelocity: 0) {
        glassViews[0].frame = CGRect(x: 30, y: 300, width: 80, height: 80)
        glassViews[1].frame = CGRect(x: 150, y: 300, width: 80, height: 80)
        glassViews[2].frame = CGRect(x: 270, y: 300, width: 80, height: 80)
    }
}
```

### 15.5 UIBarButtonItem — Novità iOS 26

```swift
class ToolbarVC: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let shareBtn = UIBarButtonItem(
            barButtonSystemItem: .action,
            target: self, action: #selector(shareAction)
        )
        
        let favBtn = UIBarButtonItem(
            image: UIImage(systemName: "heart"),
            style: .plain,
            target: self, action: #selector(favAction)
        )
        // Impedisce sfondo glass condiviso con bottoni adiacenti
        favBtn.hidesSharedBackground = true
        
        navigationItem.rightBarButtonItems = [shareBtn, favBtn]
        
        // ALTERNATIVA: fixedSpace per separare visivamente
        let spacer = UIBarButtonItem.fixedSpace(0)
        navigationItem.rightBarButtonItems = [shareBtn, spacer, favBtn]
    }
    
    @objc func shareAction() { }
    @objc func favAction() { }
}
```

### 15.6 Corner Configuration e GlassCardView Riutilizzabile

```swift
// Corner configuration nuova in iOS 26
// .containerRelative: angoli si adattano automaticamente al container
effectView.cornerConfiguration = .containerRelative

// --- Componente riutilizzabile ---
class GlassCardView: UIView {
    private let visualEffectView: UIVisualEffectView
    
    init(frame: CGRect, tintColor: UIColor? = nil,
         isInteractive: Bool = false, cornerRadius: CGFloat = 20) {
        let glass = UIGlassEffect()
        glass.tintColor = tintColor
        glass.isInteractive = isInteractive
        visualEffectView = UIVisualEffectView(effect: glass)
        super.init(frame: frame)
        
        visualEffectView.frame = bounds
        visualEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        visualEffectView.layer.cornerRadius = cornerRadius
        visualEffectView.clipsToBounds = true
        addSubview(visualEffectView)
    }
    
    required init?(coder: NSCoder) { fatalError() }
    
    var contentView: UIView { visualEffectView.contentView }
    
    func animateTint(to color: UIColor?) {
        let newEffect = UIGlassEffect()
        newEffect.tintColor = color
        UIView.animate(withDuration: 0.3) {
            self.visualEffectView.effect = newEffect
        }
    }
}
```

---

## 16. Accessibilità

### 16.1 Adattamento Automatico

Il sistema gestisce automaticamente:
- **Reduce Transparency**: aumenta frosting
- **Increase Contrast**: colori netti e bordi
- **Reduce Motion**: riduce animazioni
- **iOS 26.1+ Tinted Mode**: opacità controllata dall'utente

### 16.2 Codice per Rispettare le Preferenze

```swift
struct AccessibleGlassView: View {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    
    var body: some View {
        VStack {
            // Disabilita glass se utente ha attivato Reduce Transparency
            Text("Accessible Content")
                .padding()
                .glassEffect(reduceTransparency ? .identity : .regular)
            
            // Rispetta Reduce Motion per animazioni
            Button("Action") {
                if reduceMotion {
                    performAction()
                } else {
                    withAnimation(.bouncy) { performAction() }
                }
            }
            .buttonStyle(.glass)
        }
    }
    
    func performAction() { /* ... */ }
}
```

### 16.3 Best Practice

- Contrasto minimo **4.5:1** (WCAG) per testo su glass
- Supplementare icone con **testo** per VoiceOver
- Usare **SF Symbols** per compatibilità VoiceOver
- Wirecare `reduceTransparency` **fin dall'inizio**
- Testare SEMPRE con impostazioni accessibilità attivate

---

## 17. Performance

### 17.1 Pattern Efficiente vs Inefficiente

```swift
// ✅ EFFICIENTE: GlassEffectContainer
GlassEffectContainer {
    HStack {
        Button("Edit") { }.glassEffect()
        Button("Delete") { }.glassEffect()
        Button("Share") { }.glassEffect()
    }
}

// ❌ INEFFICIENTE: senza container → 3x lavoro GPU
HStack {
    Button("Edit") { }.glassEffect()
    Button("Delete") { }.glassEffect()
    Button("Share") { }.glassEffect()
}
```

### 17.2 Equatable per View Complesse

```swift
struct ExpensiveGlassCard: View, Equatable {
    let item: Item
    static func == (lhs: ExpensiveGlassCard, rhs: ExpensiveGlassCard) -> Bool {
        lhs.item.id == rhs.item.id
    }
    var body: some View {
        VStack { Text(item.title); Text(item.description) }
            .padding()
            .glassEffect()
    }
}
```

### 17.3 Cose da Evitare

```swift
// ❌ Animazioni continue sul glass
.rotationEffect(Angle(degrees: rotationAmount))
.animation(.linear(duration: 2).repeatForever(), value: rotationAmount)

// ❌ Glass-su-glass (mai sovrapporre più livelli)
ZStack {
    View1().glassEffect()
    View2().glassEffect()  // NO
}

// ✅ Un solo livello glass sopra il contenuto
ZStack {
    ContentView()               // Senza glass
    NavigationOverlay()         // Un solo livello
        .glassEffect()
}
```

---

## 18. Leggibilità — Soluzioni

### 18.1 Gradient Fade ("Deliquify")

```swift
struct TabBarFadeModifier: ViewModifier {
    let fadeLocation: CGFloat = 0.4
    let opacity: CGFloat = 0.85
    let backgroundColor: Color = Color(.systemBackground)
    
    func body(content: Content) -> some View {
        GeometryReader { geometry in
            ZStack {
                content
                if geometry.safeAreaInsets.bottom > 10 {
                    VStack {
                        Spacer()
                        LinearGradient(
                            gradient: Gradient(stops: [
                                .init(color: .clear, location: 0.0),
                                .init(color: backgroundColor.opacity(opacity),
                                      location: fadeLocation)
                            ]),
                            startPoint: .top, endPoint: .bottom
                        )
                        .frame(height: geometry.safeAreaInsets.bottom)
                        .allowsHitTesting(false)
                        .offset(y: geometry.safeAreaInsets.bottom)
                    }
                }
            }
        }
    }
}

extension View {
    func deliquify() -> some View { modifier(TabBarFadeModifier()) }
}

// Uso: ScrollView { ColorfulContent() }.deliquify()
```

### 18.2 Background Dimming

```swift
ZStack {
    Image("busy-background")
        .resizable()
        .ignoresSafeArea()
        .overlay(Color.black.opacity(0.3))  // Dimming leggero
    
    HStack {
        Button("Edit") { }.buttonStyle(.glass)
        Button("Share") { }.buttonStyle(.glass)
    }
}
```

---

## 19. Glass Text con Core Text

```swift
import CoreText
import SwiftUI

func createTextPath(_ string: String, font: UIFont) -> Path {
    var path = Path()
    let attrStr = NSAttributedString(string: string, attributes: [.font: font])
    let line = CTLineCreateWithAttributedString(attrStr)
    let runs = CTLineGetGlyphRuns(line) as! [CTRun]
    
    for run in runs {
        for index in 0..<CTRunGetGlyphCount(run) {
            var glyph = CGGlyph()
            CTRunGetGlyphs(run, CFRange(location: index, length: 1), &glyph)
            var position = CGPoint.zero
            CTRunGetPositions(run, CFRange(location: index, length: 1), &position)
            
            if let glyphPath = CTFontCreatePathForGlyph(font, glyph, nil) {
                var transform = CGAffineTransform(translationX: position.x, y: position.y)
                if let tp = glyphPath.copy(using: &transform) {
                    path.addPath(Path(tp))
                }
            }
        }
    }
    return path
}

// Uso:
Rectangle()
    .frame(width: 300, height: 80)
    .glassEffect(.clear, in: createTextPath("GLASS", font: .boldSystemFont(ofSize: 72)))
```

---

## 20. Backward Compatibility

### 20.1 View Modifier Wrapper

```swift
struct GlassCompatModifier: ViewModifier {
    var tintColor: Color?
    
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            if let tintColor {
                content.glassEffect(.regular.tint(tintColor))
            } else {
                content.glassEffect()
            }
        } else {
            content.background(.ultraThinMaterial)
        }
    }
}

struct CompatGlassButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        if #available(iOS 26, *) {
            configuration.label
                .padding()
                .glassEffect(.regular.interactive())
                .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
        } else {
            configuration.label
                .padding()
                .background(.ultraThinMaterial, in: Capsule())
                .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
        }
    }
}

extension View {
    func compatGlass(tint: Color? = nil) -> some View {
        modifier(GlassCompatModifier(tintColor: tint))
    }
}

// Uso:
Text("Cross-version!").padding().compatGlass(tint: .blue)
Button("Compat") { }.buttonStyle(CompatGlassButtonStyle())
```

### 20.2 Symbol Variants

```swift
// iOS 26: varianti "none" (senza cerchio/riempimento)
// iOS 18: varianti classiche
Image(systemName: "checkmark")
    .symbolVariant({
        if #available(iOS 26, *) { return .none }
        else { return .circle.fill }
    }())
```

### 20.3 Timeline

Apple rimuoverà l'opzione di mantenere i design attuali in **iOS 27**. Adozione obbligatoria.

---

## 21. Problemi Noti e Workaround

### Issue 1: Interactive Shape Mismatch
```swift
// ❌ RoundedRectangle ma risponde come Capsule
.glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))

// ✅ Usare buttonStyle(.glass) per i bottoni
Button("Action") { }
    .buttonStyle(.glass)
    .buttonBorderShape(.roundedRectangle(radius: 12))
```

### Issue 2: glassProminent Circle Artifacts
```swift
// ✅ Aggiungere clipShape
Button("X") { }
    .buttonStyle(.glassProminent)
    .buttonBorderShape(.circle)
    .clipShape(Circle())
```

### Issue 3: Menu Morphing (iOS 26.1)
```swift
// ✅ Button style custom per Menu
struct MenuGlassStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(12)
            .glassEffect(.regular.interactive(), in: .circle)
    }
}

Menu {
    Button("Option 1") { }
    Button("Option 2") { }
} label: {
    Image(systemName: "ellipsis").frame(width: 44, height: 44)
}
.buttonStyle(MenuGlassStyle())
```

### Issue 4: Menu in GlassEffectContainer
```swift
// ❌ iOS 26.1: Menu dentro GlassEffectContainer rompe morphing
// ✅ Tenere Menu FUORI dal container
```

---

## 22. App Icons — Icon Composer

### Workflow
1. Progettare a 1024×1024px (iPhone/iPad/Mac) o 1088px (Watch) in Figma/Illustrator/Sketch
2. Strutturare in layer separati (foreground, background)
3. Importare in Icon Composer (SVG/PNG) — incluso in Xcode 26
4. Personalizzare: specular highlights, blur, traslucenza, ombre, blend mode
5. Preview real-time su device e modalità (Default, Dark, Clear Light/Dark, Tinted Light/Dark)
6. Esportare file `.icon` → Xcode genera tutte le dimensioni automaticamente

### Principi
- Forma singola riconoscibile — scopo in 3 parole
- 1-2 colori per visibilità con effetti dinamici
- Testare su diversi wallpaper

---

## 23. Differenze Piattaforma

| Piattaforma | Adattamenti |
|-------------|-------------|
| **iOS** | Tab bar fluttuanti + minimizzazione scroll, ricerca in basso, highlight speculari al movimento |
| **iPadOS** | Sidebar fluttuanti, riflessione ambiente, Inspector a due colonne |
| **macOS** | Angoli concentrici finestre, menu bar trasparente, controlli più alti |
| **watchOS** | Widget location-aware, Smart Stack |
| **tvOS** | Glass focalizzato, highlight direzionali |
| **visionOS** | Widget spaziali, glass nativo spatial computing |

---

## 24. Sessioni WWDC 2025

| Sessione | Cod. | Descrizione |
|----------|------|-------------|
| Meet Liquid Glass | — | Panoramica design language |
| Dive deeper into the new design | — | Design visivo, architettura informativa |
| Build a SwiftUI app with the new design | 323 | SwiftUI completo |
| Build a UIKit app with the new design | 284 | UIKit completo |
| Applying Liquid Glass to custom views | — | View custom |
| Refining toolbar glass effects | — | Toolbar dettagli |
| Create icons with Icon Composer | 361 | Workflow icone |
| Say hello to the new look of app icons | — | Apparenze icone |
| Principles of inclusive app design | — | Accessibilità |

---

## 25. Risorse

### Apple
- https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass
- https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/new-design-gallery/
- Sample Code: **Landmarks: Building an app with Liquid Glass**, **Refining toolbar glass effects**

### Community
| Repo | Descrizione |
|------|-------------|
| mertozseven/LiquidGlassSwiftUI | Quote card + azioni espandibili |
| GonzaloFuentes28/LiquidGlassCheatsheet | Guida implementazione |
| GetStream/awesome-liquid-glass | Slider, tab bar, menu, floating buttons |
| artemnovichkov/iOS-26-by-Examples | Esempi feature iOS 26 |
| conorluddy/LiquidGlassReference | Reference Swift/SwiftUI completo |
| jaikrishnavj/LiquidGlass-Handbook | 12+ capitoli interattivi |

### Blog
- **Donny Wals** — Designing custom UI with Liquid Glass
- **Swift with Majid** — Glassifying custom views series
- **Nil Coalescing** — Presenting Liquid Glass sheets
- **Create with Swift** — Design principles guide
- **Fat Bob Man** — UIKit + SwiftUI hybrid adaptation
- **JuniperPhoton** — Adopting Liquid Glass: Experiences and Pitfalls

---

## 26. Checklist di Adozione

- [ ] Installare Xcode 26 e ricompilare
- [ ] Verificare aggiornamenti automatici
- [ ] Audit componenti custom
- [ ] Rimuovere background personalizzati da toolbar/sheet
- [ ] Aggiornare icone con Icon Composer
- [ ] Implementare `GlassEffectContainer` per gruppi di controlli
- [ ] Aggiungere morphing con `glassEffectID`
- [ ] Backward compatibility iOS 18
- [ ] Test accessibilità (Reduce Transparency, Increase Contrast, Reduce Motion)
- [ ] Test dispositivi vecchi (iPhone 11-13) + profiling GPU
- [ ] Verificare leggibilità su diversi sfondi
- [ ] Testare tutte le modalità icone

---

*Documento aggiornato: Febbraio 2026 — Basato su WWDC 2025, Apple Developer Documentation, HIG iOS 26, community resources*
