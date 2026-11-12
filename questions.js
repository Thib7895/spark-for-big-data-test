/* ============================================================
   Banque de questions — cours Big Data / Spark / Hadoop
   Source : les 8 chapitres PDF du cours
   ============================================================ */

const CHAPTERS = [
  {
    id: "intro",
    num: "0",
    title: "Introduction : Datalake, stockage & cluster",
    icon: "🌊",
    color: "#38bdf8",
    summary: [
      "Big Data = données qui ne tiennent pas sur un seul serveur, même très gros (définition du cours). Les 3V : Volume, Velocity, Variety (+ veracity, value).",
      "Ordres de grandeur : à partir de ~1 Giga octet (1e9) on parle de Big Data, puis Téra (1e12), Péta (1e15 = 1000 To).",
      "Règles empiriques : batch < 1 To de RAM → ne pas sortir Spark, utiliser DuckDB en standalone. > 1 To → justifier pourquoi !",
      "Scaling vertical (acheter un serveur plus gros, coût exponentiel) → remplacé par le scaling horizontal (cluster de machines commodity).",
      "Deux ressources virtuelles : HDFS pour le stockage, Yarn/Kubernetes pour le calcul. On ne voit plus les serveurs physiques.",
      "Aujourd'hui compute et storage sont séparés et élastiques (cloud) : plus de ratio fixe « 1 CPU = 8 disques ».",
      "SSD NVMe (~15 Go/s) : lire 1 To prend ~68 s depuis un seul disque → le full scan n'est plus un problème, le bottleneck c'est RAM + CPU.",
      "Datalake organisé en 3 couches : RAW (privé, brut) → APP/staging → LAKE (parquet, partageable, relisable analytiquement)."
    ]
  },
  {
    id: "spark",
    num: "1",
    title: "Spark : Datasets distribués & opérations",
    icon: "⚡",
    color: "#f59e0b",
    summary: [
      "List<T> en Java limitée : index sur int 32 bits (< 2^32 ≈ 2 milliards d'éléments) + mémoire bornée au heap (-Xmx).",
      "Dataset distribué = List<Partition<T>> : plus de limite de nombre d'éléments ni de RAM d'un nœud, mais chaque partition doit tenir dans la RAM d'un executor et le dataset ne doit pas être skewed.",
      "1 partition = 1 tâche = 1 thread. Compromis : threads ≈ vcore (souvent 2×cores − 1), avec threads × mémoire de tâche < RAM totale.",
      "Style fonctionnel + immutabilité : map, filter, flatMap, mapPartitions… pas de boucles impératives ni de forEach.",
      "Transformations narrow (par partition, pas de réseau : map/filter/flatMap/mapPartitions/sortWithinPartitions) vs wide (shuffle : sort/orderBy, repartition, join, groupBy).",
      "count() = map (count par partition) + reduce (somme des résultats partiels).",
      "Pas d'UPDATE/DELETE en Spark natif : update = map qui renvoie un nouvel objet, delete = filter. UPDATE/UPSERT SQL possibles avec Iceberg ou DeltaLake.",
      "read sur un dossier lit implicitement **/*.parquet et ignore les fichiers cachés (_*, .* comme _SUCCESS, .crc).",
      "write produit 1 fichier par partition (noms UUID / part-000xx) + fichier marqueur _SUCCESS.",
      "spark.shuffle.partitions = 200 par défaut. repartition(N) = round-robin équilibré ; repartition(col) = hash % N, possiblement skewed ; sort = sampling + repartition par range + tri local (TimSort).",
      "Jointures : BroadcastHashJoin (petite table broadcastée à tous les executors) ou SortMergeJoin (2 grosses tables : sort + shuffle co-group + merge).",
      "Les fichiers de shuffle sont écrits sur le disque local des executors (spill to disk), pas « juste en mémoire »."
    ]
  },
  {
    id: "nosql",
    num: "1.1",
    title: "NoSQL vs bases OLTP classiques (ACID, fichiers)",
    icon: "🗄️",
    color: "#a78bfa",
    summary: [
      "OLTP classique : ACID, transactions WAL, B-Trees, index, modification de blocs en place (lseek + writeAt).",
      "Stockage Big Data (HDFS) : append-only, 1 seul writer, pas de modification au milieu d'un fichier : on recrée le fichier (delete + re-create).",
      "Fichiers cachés : _SUCCESS (marqueur de succès), .crc (checksum SHA-256), _temporary (commit en cours).",
      "Commit « atomique » par répertoire : écrire dans _temporary, supprimer les vieux fichiers, renommer les nouveaux. Peut échouer/timeout à grande échelle (exemple SG).",
      "Pas d'isolation : un autre processus peut écraser la table pendant ta lecture → FileNotFoundException. Spark échoue plutôt que de renvoyer un résultat « rafraîchi ».",
      "Les B-Trees ne servent à rien en Big Data si tout n'est pas en cache → préférer le full scan parallélisé ou les scans optimisés Parquet (pruning, PPD, bloom).",
      "Stratégie d'update : overwrite par partition (= répertoire) ; Iceberg apporte isolation/consistance + time travel (copy-on-write ou merge-on-read)."
    ]
  },
  {
    id: "histoire",
    num: "2",
    title: "Histoire du calcul distribué",
    icon: "📜",
    color: "#94a3b8",
    summary: [
      "Loi de Moore : puissance de calcul qui double régulièrement (~tous les 2 ans). Loi de Kryder : densité des disques ×2 tous les ~13 mois.",
      "1 Peta = 1000 Teras = 2^50 octets ≈ 1 125 899 906 842 624 octets.",
      "Évolution du hardware : super-calculateurs « Crays » → PC (1980) → datacenters de lames (blades) commodity. Vertical → horizontal.",
      "Timeline : papier MapReduce Google 2004 → Hadoop @Yahoo 2006 → fin d'usage de MapReduce ~2014 ; papier Spark 2010 → projet Apache 2013 → Spark sur Kubernetes 2020.",
      "MapReduce : tolérant aux pannes mais écrit tous les résultats intermédiaires sur HDFS → ~100x plus lent que Spark.",
      "MTBF d'un disque ~500 000 h (~50 ans) semble rassurant, mais à l'échelle d'un datacenter ça devient une panne toutes les ~1h15."
    ]
  }
];
const CHAPTERS_PART2 = [
  {
    id: "failures",
    num: "3",
    title: "Pannes & résilience des systèmes distribués",
    icon: "🛡️",
    color: "#f87171",
    summary: [
      "La panne n'est pas exceptionnelle, c'est le chemin normal : il faut la gérer partout dans le code (retry, health checks…).",
      "MTBF à l'échelle : 10 000 serveurs × 4 disques → 1 panne toutes les 1h15 (~19/jour).",
      "Pet vs Cattle : les serveurs sont anonymes et interchangeables (id = numéro), on ne les chouchoute pas.",
      "On soumet un job au scheduler (Yarn/K8s), on ne choisit pas le serveur : le système alloue, réessaie, reschedule.",
      "Infrastructure immutable : on ne répare pas une VM en place, on la drop et on la recrée.",
      "Dupliquer un composant : proba que 2 tombent en panne = 0,01² = 1e-4, que 3 tombent = 1e-6. Mais attention aux pannes corrélées (Ariane 501 : même bug logiciel sur 2 hardwares indépendants → même overflow au même instant).",
      "SPOF : tout point unique (alimentation électrique commune, base de données partagée, réseau) peut tout faire tomber.",
      "Élection de leader : il faut un quorum > 50% et un nombre impair de nœuds (3, 5, 7). Partition réseau → split-brain (2 leaders) ; 0 leader → rien ne marche.",
      "Théorème CAP : choisir 2 parmi Cohérence, Disponibilité, Tolérance au partitionnement. ZooKeeper = CP.",
      "ZooKeeper : petit cluster de 3/5/7 nœuds, znodes hiérarchiques, ephemeral znodes, watches ; écritures sérialisées sur le leader + quorum. Pas une BDD généraliste (tout en mémoire).",
      "Sharding : ServerId = Id mod N → scale linéaire, mais redimensionner N impose de tout re-shuffler ; réservé aux accès par clé connue.",
      "Chaos engineering (Netflix) : tuer aléatoirement processus/VM/datacenter pour tester. SLA : 99,99% = 52 min 35 s/an ; 99,999% = 5 min 15 s/an ; 99,9999% = 31 s/an.",
      "Piège : un Full GC « stop-the-world » de 30 s > timeout des health checks → le leader perd son élection → on en élit un autre → boucle catastrophique."
    ]
  },
  {
    id: "hadoop",
    num: "4",
    title: "Écosystème Hadoop : ZooKeeper, HDFS, Yarn, Oozie",
    icon: "🐘",
    color: "#4ade80",
    summary: [
      "HDFS = NameNode (toutes les métadonnées en mémoire JVM, ~4 ko/fichier → c'est LE bottleneck, SPOF) + N DataNodes qui stockent les blocs.",
      "1 fichier = N blocs de 128 Mo par défaut ; Replication Factor = 3, rack-aware (1 réplique dans le même rack, ≥1 dans un autre rack).",
      "API append-only : 1 seul writer exclusif par fichier, seek seulement en lecture. HDFS déteste les petits fichiers (> 200 M de fichiers → NameNode avec -Xmx200G).",
      "Haute dispo du NameNode : 2 NameNodes actif/standby (FsImage + FsEdit répliqués).",
      "Yarn = Yet Another Resource Negotiator : ResourceManager + NodeManagers + 1 AppMaster par appli + containers. Files (queues) hiérarchiques, capacité en %.",
      "Yarn (impératif : on appelle pour lancer) vs Kubernetes (déclaratif : état cible dans etcd, piloté par des operators). etcd = cœur de K8s.",
      "Masters Spark possibles : local[*], standalone (spark://), Mesos (déprécié en 3.2), Yarn, Kubernetes (k8s://, depuis Spark 3.0).",
      "Oozie : orchestrateur (coordinator CRON + workflow.xml d'actions shell/spark). Il manque le data lineage et les déclencheurs sur arrivée de données (cf OpenLineage/Marquez).",
      "ZooKeeper sert à la coordination dans Hadoop ; alternatives modernes : etcd (K8s), Consul. Kafka 3 n'utilise plus ZooKeeper.",
      "MapReduce n'est plus utilisé (~100x plus lent que Spark) sauf pour lancer des commandes shell via Oozie. HiveServer2 est déprécié → Spark ThriftServer (SQL compatible, plus rapide). Livy = REST pour soumettre des jobs Spark."
    ]
  },
  {
    id: "metastore",
    num: "7",
    title: "SQL → fichiers Hadoop : Hive MetaStore & optimisations IO",
    icon: "🐝",
    color: "#facc15",
    summary: [
      "Le MetaStore ne contient que des DDL/métadonnées (schéma, types, URL de location, format de fichier, partitions) — jamais les données HDFS.",
      "EXTERNAL TABLE : le drop ne supprime PAS les fichiers (données indépendantes). MANAGED TABLE : le drop supprime tout → à éviter.",
      "Partition = répertoire « col=valeur » (ex /data/student/promo=2020). Ajout explicite : ALTER TABLE … ADD PARTITION ou MSCK REPAIR TABLE.",
      "Partition pruning : une condition sur une colonne de partition ne scanne que les répertoires concernés.",
      "Une partition sert surtout de granularité d'INSERT OVERWRITE (scope du batch, ex date=yyyy-MM-dd) — pas d'abord à accélérer la recherche. Ne pas dépasser ~2 niveaux.",
      "INSERT INTO ajoute des fichiers ; INSERT OVERWRITE recrée tout. Spark 3.x ne supporte ni UPDATE ni UPSERT nativement (extensions DeltaLake / Iceberg).",
      "Attention : spark.sql.shuffle.partitions = 200 par défaut → un overwrite de partition peut créer 200 petits fichiers, et HDFS déteste ça.",
      "Les 5 optimisations de lecture : 1/ schéma typé + encodage binaire, 2/ format splittable, 3/ partition pruning, 4/ column pruning, 5/ predicate push-down (stats min/max + bloom).",
      "Hive MetaStore ≠ HiveServer2. Spark s'appuie sur le Hive MetaStore via son ExternalCatalog. discover.partitions=true = mauvaise idée (polling inefficace du metastore)."
    ]
  },
  {
    id: "parquet",
    num: "8",
    title: "Format de fichier Parquet",
    icon: "🧊",
    color: "#22d3ee",
    summary: [
      "Colonnes stockées les unes après les autres (columnar) → column pruning : on seek et on ne lit que les colonnes demandées ; lecteur vectorisé ~9x plus rapide.",
      "Métadonnées dans le footer (fin de fichier) : schéma, offsets des row groups, statistiques. Lecture : taille du fichier → 4 derniers octets = taille du footer → footer.",
      "Row groups (~128 Mo = parquet.block.size) : le fichier est splittable, 1 row group ≈ 1 partition Spark. .gz n'est PAS splittable (1 thread seulement) ; snappy/lz4 restent splittables.",
      "Compressions : snappy (rapide), gzip (meilleur ratio, plus lent), lz4 (compromis), appliquées par chunk de colonne.",
      "Encodages : RLE, dictionnaire (défaut si ≤ ~1 Mo par chunk), delta encoding, varint + ZigZag pour les entiers.",
      "Statistiques min/max par colonne et par row group → predicate push-down : si la valeur cherchée est hors [min, max], on saute le row group (faux positifs possibles).",
      "Bloom filter : test d'appartenance probabiliste, taux de faux positifs ≈ (1 − e^(−kn/m))^k.",
      "Fichiers triés + blocs plus petits → statistiques plus fines → plus de blocs skippés (exemple : id=542 avec des blocs triés).",
      "Parquet est immutable : « update » = recopier le fichier entier (ou passer par Iceberg). Schéma embarqué : ajout de colonne OK (null), renommage = drop+add, conflit de type = erreur.",
      "mergeSchema=true fusionne les schémas de plusieurs fichiers (plus lent). Mauvais pour les petits fichiers (footer non compressé).",
      "Écrire « write once, read many » : repartition(n)/coalesce pour éviter les petits fichiers, sortWithinPartitions(colA, colB, …, id) pour de bonnes stats, parquet.block.size ajustable."
    ]
  }
];
CHAPTERS.push(...CHAPTERS_PART2);

const QUESTIONS = [
  /* ---------------- Chapitre 0 : Intro Datalake ---------------- */
  { id: "intro1", ch: "intro", type: "qcm",
    q: "Selon le cours, qu'est-ce qui définit le « Big Data » ?",
    options: [
      "Des données supérieures à 1 Pétaoctet obligatoirement",
      "Des données qui ne tiennent pas sur un seul serveur, même un serveur très gros et très cher",
      "Uniquement des flux streaming en temps réel",
      "Des données stockées exclusivement dans des bases SQL relationnelles"
    ],
    answer: 1,
    explain: "Définition du cours : le Big Data, c'est quand les données ne tiennent pas sur UNE seule machine (même un serveur à 10 M$ avec baie SAN). Les 3V : Volume, Velocity, Variety." },
  { id: "intro2", ch: "intro", type: "multi",
    q: "Quels sont les « 3V » du Big Data (et les 2 V supplémentaires souvent ajoutés) ?",
    options: ["Volume", "Velocity", "Variety", "Veracity", "Value"],
    answer: [0, 1, 2, 3, 4],
    explain: "3V = Volume, Velocity, Variety. On ajoute souvent Veracity (fiabilité) et Value (valeur métier)." },
  { id: "intro3", ch: "intro", type: "qcm",
    q: "À partir de quelle volumétrie le cours considère-t-on qu'on entre dans le « Big Data » ?",
    options: ["Dès 1 kilo-octet", "À partir d'environ 1 million d'enregistrements (1e6)", "À partir du Giga octet (1e9) et au-delà : Giga → Téra → Péta", "Uniquement au-delà du Péta octet"],
    answer: 2,
    explain: "Échelle du cours : 1…1000, 50 000, 1 million (e6), 1 milliard (e9) => à partir de e9 (Giga octets) : BIG Data, puis Téra (e12), Péta (e15)." },
  { id: "intro4", ch: "intro", type: "vf",
    q: "Règle empirique n°1 du cours : si ton batch tient en moins de 1 To de RAM, inutile d'utiliser Spark distribué — un DuckDB standalone suffit.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Règle n°1 : < 1 To de RAM → tout mettre en RAM, ne prétends pas faire du « Big Data », utilise DuckDB. Règle n°2 : si tu prétends avoir besoin de > 1 To de RAM, explique pourquoi (souvent on recharge inutilement 30 ans d'archives)." },
  { id: "intro5", ch: "intro", type: "qcm",
    q: "Scaling vertical vs horizontal : quelle affirmation est correcte ?",
    options: [
      "Le vertical (acheter un serveur de plus en plus gros) a un coût exponentiel et des limites physiques ; l'horizontal consiste à agréger N machines « commodity » en cluster",
      "L'horizontal consiste à acheter un super-calculateur type « Cray »",
      "Le vertical est toujours moins cher à grande échelle",
      "Le horizontal ne fonctionne qu'avec des disques SSD"
    ],
    answer: 0,
    explain: "Historiquement : super-calculateurs → PC (1980) → datacenters de lames commodity. En banque OLTP on fait encore beaucoup de vertical (128 cœurs, 500 Go RAM + baie SAN = millions d'euros), mais le Big Data passe à l'horizontal." },
  { id: "intro6", ch: "intro", type: "qcm",
    q: "Dans l'exemple de la Société Générale (2020) cité dans le cours, quelle volumétrie et quel « petit » cluster sont mentionnés ?",
    options: [
      "3 Go de données sur 2 serveurs",
      "3 Petaoctets de données sur un cluster de 6 racks, ~90 serveurs × {256 Go RAM, 42 cœurs, 8 disques}",
      "500 To sur 48 disques dans une seule baie 2U",
      "3 To sur un cluster Kubernetes de 1000 nœuds"
    ],
    answer: 1,
    explain: "SG : 3 Petas en 2020 (Vars/Risks/paramètres de marché/trades), stockés sur ~90 serveurs (6 racks) avec 256 Go RAM + 42 cœurs + 8 disques chacun. 1 Peta = 1000 Teras = 2^50 octets." },
  { id: "intro7", ch: "intro", type: "multi",
    q: "Quelles sont les « 2 ressources virtuelles » qu'un utilisateur manipule dans un datalake moderne (les serveurs physiques restant invisibles) ?",
    options: ["HDFS (ou stockage objet S3/ADLS) pour le stockage : répertoires et fichiers", "Yarn ou Kubernetes pour le calcul : jobs et containers", "Un accès SSH sur chaque serveur nommé individuellement", "Une base Oracle unique accessible en JDBC"],
    answer: [0, 1],
    explain: "Mind shift : au lieu de ssh/scp vers des serveurs nommés, on utilise l'API HDFS (hdfs dfs -ls/-put/-get…) pour le stockage et l'API Yarn/K8s (soumettre un job) pour le calcul." },
  { id: "intro8", ch: "intro", type: "qcm",
    q: "Pourquoi le cours dit-il qu'aujourd'hui « on n'a plus peur du full scan » ?",
    options: [
      "Parce que les données tiennent toutes en RAM",
      "Parce qu'un SSD NVMe offre ~15 Go/s : lire 1 To depuis un seul disque prend ~68 s ; avec des disques distribués, le bottleneck devient le traitement RAM+CPU, pas la lecture",
      "Parce que HDFS met tout en cache RAM comme en 2006",
      "Parce que le réseau fait 300 Go/s dans tous les cas"
    ],
    answer: 1,
    explain: "Ancienne hypothèse (2006, HDD) : stockage lent, réseau lent → data locality, cache RAM, déplacer le code près des disques. Aujourd'hui SSD NVMe ~2M IOPS, ~15 Go/s, réseau ~300 Go/s : le full scan distribué est rapide, le vrai goulot c'est RAM+CPU." },
  { id: "intro9", ch: "intro", type: "qcm",
    q: "Quelles sont les 3 couches d'un datalake « bien organisé » selon le cours ?",
    options: [
      "Bronze / Argent / Or",
      "RAW (brut, privé) → APP/staging (privé) → LAKE (parquet, partageable après validation du DataOffice)",
      "OLTP / OLAP / DataMart",
      "Hot / Warm / Cold uniquement"
    ],
    answer: 1,
    explain: "Chaque projet a 3 bases read-write : RAW, APP, LAKE. Seul le LAKE est partageable (lecture accordée par le DataOffice). Un dataset n'est écrivable que par son projet propriétaire. LAKE = Parquet." },
  { id: "intro10", ch: "intro", type: "qcm",
    q: "Aujourd'hui, comment évoluent les ressources compute et storage dans un datalake cloud ?",
    options: [
      "On garde un ratio fixe 1 CPU = 8 disques sur chaque nœud",
      "On les sépare : compute virtualisé et pay-as-you-go (K8s/VMs), storage élastique dédié à la densité de données — deux élasticités différentes",
      "On revient au stockage local attaché à chaque nœud de calcul",
      "Le stockage devient la ressource la plus chère et le compute est gratuit"
    ],
    answer: 1,
    explain: "Tendance : séparer compute et storage. RAM+CPU = électricité = coût, ressource limitée et partagée à la demande. Le disque est une ressource énorme mais peu utilisée : on choisit le disque selon le ratio prix/vitesse (hot/cold/archivé)." },
  /* ---------------- Chapitre 1 : Spark datasets ---------------- */
  { id: "spark1", ch: "spark", type: "multi",
    q: "Quelles sont les 2 restrictions d'une List<T> / ArrayList classique en Java (qui motivent le passage au Dataset distribué) ?",
    options: [
      "Les tableaux sont indexés par un int 32 bits : N < 2^32 − 1 (~2 milliards d'éléments)",
      "Les objets vivent dans le heap de la JVM : taille totale < -Xmx",
      "Les listes ne peuvent pas être parcourues avec un for",
      "Une List<T> ne supporte pas les lambdas"
    ],
    answer: [0, 1],
    explain: "Restriction 1 : index int 32 bits → max ~2 milliards d'éléments. Restriction 2 : tout tient dans le heap (-Xmx). Le Dataset distribué = List<Partition<T>> lève la limite de nombre, mais garde la contrainte : chaque partition < RAM d'un executor." },
  { id: "spark2", ch: "spark", type: "qcm",
    q: "Quelle granularité de parallélisme utilise Spark ?",
    options: [
      "1 ligne = 1 tâche sur 1 thread",
      "1 partition = 1 tâche = 1 thread : la tâche charge la partition, la traite ligne par ligne, écrit le résultat",
      "1 JVM = 1 tâche qui traite tout le dataset en mémoire",
      "1 cœur = 1 partition fixe pour toute la durée du job"
    ],
    answer: 1,
    explain: "1 Task = 1 Partition processed by 1 Thread. Le nombre de threads concurrents est un compromis : threads ≈ vcore (souvent 2×cores−1) et threads × mémoire/tâche < RAM totale de l'executor." },
  { id: "spark3", ch: "spark", type: "qcm",
    q: "En Spark, le style de programmation attendu est…",
    options: [
      "Impératif avec boucles for et ds.forEach(...)",
      "Fonctionnel et immutable : ds2 = ds1.map(row -> new Row(...)).filter(...), sans modifier les objets existants",
      "Orienté objet avec setters sur chaque ligne",
      "SQL uniquement, jamais d'API Dataset"
    ],
    answer: 1,
    explain: "Immutabilité (getters, new, pas de setters) + API fonctionnelle (lambdas sérialisables). Le code itératif « old-school » ne scale pas, même pas en multi-threads." },
  { id: "spark4", ch: "spark", type: "multi",
    q: "Quelles opérations sont des transformations NARROW (par partition, sans mouvement réseau) ?",
    options: ["map", "filter / flatMap", "mapPartitions", "sortWithinPartitions", "sort (orderBy) global", "repartition", "join"],
    answer: [0, 1, 2, 3],
    explain: "Narrow = chaque partition transformée indépendamment : map, filter, flatMap, mapPartitions, sortWithinPartitions (= SORT BY en SQL). Wide = shuffle avec mouvement réseau entre partitions : sort/orderBy global, repartition, join, groupBy/reduceByKey." },
  { id: "spark5", ch: "spark", type: "qcm",
    q: "Comment Spark calcule-t-il dataset.count() en distribué ?",
    options: [
      "Le driver collecte toutes les lignes et compte en local",
      "Map : chaque partition compte localement, puis Reduce : le driver somme les résultats partiels",
      "Un seul executor parcourt tout le dataset séquentiellement",
      "Le count est estimé par échantillonnage de 1% des partitions"
    ],
    answer: 1,
    explain: "count/find/first/min/max/sample suivent le pattern map + reduce : résultat partiel par partition, puis réduction (somme pour count) côté driver. Idem pour reduceByKey." },
  { id: "spark6", ch: "spark", type: "multi",
    q: "En Spark « pur » (sans extension), comment remplaces-tu les opérations CRUD classiques ?",
    options: [
      "CREATE : spark.createDataset(list) ou spark.read…load(path) ou spark.sql(...)",
      "READ : ds.map(...) / ds.mapPartitions(...) — jamais de boucles sur partition(i).rowAt(j)",
      "UPDATE : ds.map(row -> new Row(...)) — on crée de nouveaux objets ; ou extension Iceberg/DeltaLake pour du SQL UPDATE/UPSERT",
      "DELETE : ds.filter(...) ; ou extension Iceberg/DeltaLake pour du SQL DELETE",
      "UPDATE : ds.setRow(row) directement sur le dataset"
    ],
    answer: [0, 1, 2, 3],
    explain: "Il n'y a PAS de « U » ni de « D » natifs : pas de setRow, pas de removeRow, pas de SQL UPDATE/DELETE (Spark 3.x). Update = map vers un nouvel objet, Delete = filter. Pour du vrai SQL UPDATE/UPSERT/DELETE/as-of : installer Iceberg ou DeltaLake." },
  { id: "spark7", ch: "spark", type: "vf",
    q: "spark.read.load(\"hdfs://path/dir\") lit implicitement tous les fichiers **/*.parquet du dossier (et sous-dossiers), en ignorant les fichiers cachés commençant par « _ » ou « . » (ex : _SUCCESS, .part-*.crc).",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "En chargeant un dossier, Spark découvre les sous-dossiers, filtre les fichiers cachés (_*, .*) et suppose des fichiers de type homogène. Les dossiers ne doivent contenir qu'un seul type de fichier." },
  { id: "spark8", ch: "spark", type: "qcm",
    q: "Lors d'un ds.write.save(path), quels fichiers obtient-on typiquement ?",
    options: [
      "1 seul gros fichier compressé en .gz obligatoirement",
      "1 fichier par partition du dataset (noms générés type UUID / part-000xx) + un fichier marqueur vide _SUCCESS",
      "Exactement 200 fichiers, quoi qu'il arrive",
      "Un fichier par ligne du dataset"
    ],
    answer: 1,
    explain: "Write distribué = 1 fichier par partition, noms aléatoires (UUID + index part-000xx), plus le marqueur _SUCCESS. Attention au « too many small files » si le dataset a énormément de petites partitions." },
  { id: "spark9", ch: "spark", type: "qcm",
    q: "Quelle est la valeur par défaut de spark.shuffle.partitions (nombre de partitions après un shuffle) ?",
    options: ["8", "32", "200", "1024"],
    answer: 2,
    explain: "200 par défaut. Conséquence pratique : un INSERT OVERWRITE d'une partition Hive peut produire 200 fichiers → problème de petits fichiers pour HDFS. On peut changer globalement (spark.shuffle.partitions) ou par appel (.repartition(col, N))." },
  { id: "spark10", ch: "spark", type: "multi",
    q: "Quelles affirmations sur repartition sont correctes ?",
    options: [
      "repartition(N) = redistribution round-robin (comme distribuer des cartes) → N partitions à peu près équilibrées (±1×P lignes)",
      "repartition(col) = hash(col) % N (défaut N=200) → groupes par valeur de colonne, mais possiblement SKEWED",
      "repartition(col, N) permet de fixer le nombre de partitions pour une colonne à haute cardinalité",
      "repartition(N) garantit toujours des partitions parfaitement égales, même avec des données skewed en entrée"
    ],
    answer: [0, 1, 2],
    explain: "repartition(N) round-robin = bien équilibré. repartition(col) = groupBy distribué, souvent skewed (bien choisir la colonne). repartition(col, N) = hash modulo N explicite → N partitions équilibrées si la colonne a assez de cardinalité." },
  { id: "spark11", ch: "spark", type: "qcm",
    q: "Comment fonctionne un .sort() / .orderBy() global en interne ?",
    options: [
      "Tri local de chaque partition, c'est tout",
      "Échantillonnage des valeurs (~1%) pour déterminer des limites de split, repartition par range, puis tri local (TimSort) dans chaque partition",
      "Le driver trie toutes les données en mémoire",
      "Un seul reducer reçoit toutes les lignes et les trie"
    ],
    answer: 1,
    explain: "Sort distribué = sampling (1%) → split limits → range repartition → TimSort local. Résultat : globalement ordonné. À ne pas confondre avec sortWithinPartitions (SORT BY SQL) qui trie localement sans garantir l'ordre global." },
  { id: "spark12", ch: "spark", type: "qcm",
    q: "Pour joindre une GROSSE table de faits à une PETITE table de dimension, quelle stratégie Spark privilégie-t-on ?",
    options: [
      "Sort Merge Join systématiquement",
      "BroadcastHashJoin : la petite table est collectée sur le driver puis broadcastée à tous les executors, qui la mettent en HashMap locale et font le lookup ligne par ligne",
      "Cross join puis filter",
      "On copie la grosse table sur chaque nœud"
    ],
    answer: 1,
    explain: "BroadcastHashJoin : collect de la petite table sur le driver → broadcast → HashMap par executor → lookup par clé sur chaque ligne de la grosse table. Pour 2 grosses tables (impossible à broadcaster) : Sort Merge Join distribué (sort des 2 côtés + shuffle co-group + merge)." },
  { id: "spark13", ch: "spark", type: "vf",
    q: "« Spark est plus rapide que MapReduce parce qu'il garde les données de shuffle uniquement en mémoire RAM » — cette idée reçue est FAUSSE : Spark écrit tous les fichiers de shuffle sur le disque local (avec spill to disk), ce qui est plus rapide qu'HDFS mais moins tolérant aux pannes.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Urban legend démentie par le cours : Spark sauve les résultats intermédiaires de shuffle sur le disque LOCAL des executors (éventuellement plusieurs écritures = spill), pas qu'en RAM. D'où le Shuffle Service pour relire ces fichiers quand un executor disparaît." },

  /* ---------------- Chapitre 1.1 : NoSQL vs OLTP ---------------- */
  { id: "nosql1", ch: "nosql", type: "multi",
    q: "Quelles caractéristiques des bases OLTP classiques (Oracle, Postgres…) ne se retrouvent PAS dans le stockage Big Data type HDFS ?",
    options: [
      "Transactions ACID complètes avec WAL (write-ahead log) et blocs « dirty » modifiés en place",
      "Index B-Trees et lookup rapide par rowid/adresse de bloc",
      "Capacité à modifier un octet au milieu d'un fichier (lseek + writeAt)",
      "Écriture append-only et fichiers immutables : delete + re-create du fichier entier"
    ],
    answer: [0, 1, 2],
    explain: "En Big Data : pas de lseek/writeAt (append-only), pas de B-Tree, pas de transaction par ligne. Un fichier une fois écrit est immutable : update = recréer le fichier. D'où l'absence d'ACID « per-row » (cf chapitre suivant)." },
  { id: "nosql2", ch: "nosql", type: "qcm",
    q: "Quels fichiers/dossiers « cachés » trouve-t-on typiquement dans un répertoire Hadoop/Spark ?",
    options: [
      "_SUCCESS (marqueur vide de fin de tâche réussie), .fichier.crc (checksum SHA-256), _temporary/ (commit en cours)",
      ".git/ et .DS_Store uniquement",
      "Aucun, HDFS interdit les fichiers commençant par _ ou .",
      "Uniquement des fichiers .tmp supprimés à la lecture"
    ],
    answer: 0,
    explain: "Convention Hadoop : les fichiers/dirs commençant par « _ » ou « . » sont cachés (ignorés à la lecture). _SUCCESS = succès, .crc = checksum de détection de corruption, _temporary = staging du commit." },
  { id: "nosql3", ch: "nosql", type: "vf",
    q: "Le commit « atomique » d'une écriture Spark dans un répertoire (écrire dans _temporary, supprimer les anciens fichiers, renommer les nouveaux) est vraiment atomique à toute échelle : il ne peut jamais échouer ni laisser de _temporary partiel.",
    options: ["Vrai", "Faux"],
    answer: 1,
    explain: "FAUX : à grande échelle (exemple SG avec d'énormes jobs Spark), le renommage peut dépasser le timeout et échouer, laissant un _temporary partiel, des nouveaux fichiers partiellement ajoutés et les anciens supprimés. Le lecteur peut alors lire des données partiellement « uncommitted »." },
  { id: "nosql4", ch: "nosql", type: "qcm",
    q: "Pourquoi Spark n'offre-t-il PAS de vraies transactions ACID comme Oracle ?",
    options: [
      "Par choix marketing uniquement",
      "Parce que le stockage distribué est append-only/immutable : pas de modification en place des fichiers, pas de WAL par ligne ; Spark vise plutôt ACID « par répertoire » (et même là, seulement partiellement : pas d'isolation entre writers concurrents, des partitions peuvent être commitées partiellement)",
      "Parce que HDFS ne sait pas écrire de fichiers binaires",
      "Parce que le SQL n'existe pas dans Spark"
    ],
    answer: 1,
    explain: "Spark essaie d'être ACID par répertoire (atomicité via _temporary + rename), mais : pas isolé (un autre writer peut écraser la table pendant ta lecture → FileNotFoundException), pas toujours consistant (pas de « read your writes » rafraîchi, Spark échoue plutôt que de renvoyer un résultat neuf), et des partitions peuvent être partiellement commitées." },
  { id: "nosql5", ch: "nosql", type: "qcm",
    q: "Pourquoi les B-Trees (index des bases classiques) perdent-ils leur intérêt en Big Data ?",
    options: [
      "Parce qu'il est impossible d'écrire un B-Tree en Java",
      "Parce qu'ils ne sont efficaces que si (presque) tout est caché en mémoire RAM ; avec des pétaoctets, on préfère lire des fichiers compressés en full scan parallélisé ou via les optimisations Parquet (pruning, PPD, bloom)",
      "Parce que HDFS interdit les index",
      "Parce que le B-Tree ne fait que du log(N) et pas du O(1)"
    ],
    answer: 1,
    explain: "B-Tree = lookup en log(N) efficace SI les pages sont en cache. En Big Data on ne met pas des pétaoctets en RAM : mieux vaut un full scan parallélisé ou un scan partiel optimisé (partition pruning, column pruning, predicate push-down, statistiques, bloom filters)." },
  { id: "nosql6", ch: "nosql", type: "multi",
    q: "Quelles affirmations sur la lecture/écriture de fichiers Hadoop sont correctes ?",
    options: [
      "Un writer ne peut faire que writeAppend + flush ; un lecteur ne voit que les fichiers complètement écrits et flushés",
      "Les lectures sont parallélisables et généralement alignées sur des offsets de 128 Mo ; plusieurs clients peuvent lire la même région en « duplicate reads »",
      "FSDataInputStream permet le seek (readAt(position, len)) ; FSDataOutputStream n'a que write + flush",
      "Un writer peut modifier un octet au milieu d'un fichier existant avec lseek + writeAt"
    ],
    answer: [0, 1, 2],
    explain: "Hadoop FileSystem : lecture seekable (FSDataInputStream = InputStream + Seekable), écriture append-only (FSDataOutputStream = write+flush, pas de lseek). Conséquence : impossible de « backporter » Postgres/Redis sur HDFS. Lectures concurrentes alignées sur 128 Mo." },
  { id: "nosql7", ch: "nosql", type: "qcm",
    q: "Quelle extension permet d'obtenir de vraies propriétés ACID (isolation, cohérence, time travel « SELECT AS OF ») sur des tables Hive partitionnées ?",
    options: ["Apache HBase", "Apache Iceberg (comme un « Git » au-dessus des fichiers : manifest files, snapshots)", "Flume", "Oozie"],
    answer: 1,
    explain: "Iceberg résout les problèmes de lecture/écriture concurrente des tables Hive partitionnées : isolation/consistance, time travel (SELECT AS OF version), branches. Coût : update d'une ligne = copie du fichier (copy-on-write) ou fichier de nouvelles lignes + marqueurs de delete (merge-on-read) → explosion du nombre de fichiers à purger." },
  /* ---------------- Chapitre 2 : Histoire ---------------- */
  { id: "hist1", ch: "histoire", type: "qcm",
    q: "La « loi de Kryder » du cours concerne…",
    options: [
      "La puissance de calcul qui double tous les ~2 ans (loi de Moore)",
      "La densité/capacité des disques durs qui double environ tous les 13 mois (HDD 2 To en 2011 → 10 To en 2021)",
      "La bande passante réseau des datacenters",
      "La taille de la RAM des serveurs"
    ],
    answer: 1,
    explain: "Kryder : capacité de stockage ×2 tous les ~13 mois. Moore : puissance de calcul qui double régulièrement (~tous les 18–24 mois). « Big » est relatif au temps : un smartphone de 2021 dépasse ×1000 l'ordinateur de bord d'Apollo (1968)." },
  { id: "hist2", ch: "histoire", type: "qcm",
    q: "1 Pétaoctet = … ?",
    options: ["1000 Go = 2^50 octets ≈ 1 125 899 906 842 624 octets", "1024 Go = 2^40 octets", "1 000 000 Go = 10^15 octets exactement en binaire", "8 Téraoctets"],
    answer: 0,
    explain: "1 Peta = 1000 Teras = 1 000 000 Gigas = 2^50 octets ≈ 1,1259e15 octets." },
  { id: "hist3", ch: "histoire", type: "qcm",
    q: "Place ces jalons dans l'ordre chronologique :",
    options: [
      "Papier MapReduce Google (2004) → Hadoop chez Yahoo (2006) → fin d'usage de MapReduce (~2014) ; papier Spark (2010) → projet Apache (2013) → Spark sur Kubernetes (2020)",
      "Hadoop (2006) → papier MapReduce (2004) → Spark (2010) → Kubernetes (2015)",
      "Papier Spark (2004) → MapReduce (2006) → Hadoop (2010) → Kubernetes (2013)",
      "Kubernetes (2010) → Spark (2013) → MapReduce (2014) → Hadoop (2020)"
    ],
    answer: 0,
    explain: "Timeline du cours : 1995 MPI → 2004 papier MapReduce (Google) → 2006 Hadoop (Yahoo) → 2010 papier Spark → 2012 Yarn v2 → 2013 Spark projet Apache top-level → 2014 Google abandonne MapReduce → 2015 Kubernetes → 2020 Spark sur K8s. MapReduce ~100x plus lent que Spark (écritures intermédiaires sur HDFS)." },
  { id: "hist4", ch: "histoire", type: "vf",
    q: "En 2006, l'architecture Hadoop co-localisait stockage et calcul sur les mêmes nœuds (DataNode = executor de code), avec cache RAM et « déplacer le code près des données » — à cause des disques HDD lents et du réseau lent de l'époque.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "2006 : commodity hardware, HDD + RAM uniquement, data locality obligatoire (éviter le réseau). Aujourd'hui SSD/NVMe + réseau rapide + cloud : on sépare compute et storage, on n'a plus besoin de la data locality." },
  { id: "hist5", ch: "histoire", type: "qcm",
    q: "Pourquoi MapReduce est-il « ~100x plus lent » que Spark selon le cours ?",
    options: [
      "Parce qu'il est écrit en Python",
      "Parce qu'il écrit tous les résultats intermédiaires des tâches sur HDFS, alors que Spark les garde sur le disque local des executors",
      "Parce qu'il ne parallélise pas les lectures",
      "Parce qu'il ne supporte pas Java"
    ],
    answer: 1,
    explain: "MapReduce legacy : Map() écrit ses résultats intermédiaires sur HDFS, puis Reduce() les relit — d'où l'inefficacité. Spark optimise en gardant les shuffle files sur disque local. Aujourd'hui « personne n'utilise plus MapReduce », sauf Oozie pour lancer des commandes shell." },

  /* ---------------- Chapitre 3 : Failures & résilience ---------------- */
  { id: "fail1", ch: "failures", type: "qcm",
    q: "Dans un datacenter de 10 000 serveurs × 4 disques (MTBF disque ~500 000 h), à quelle fréquence a-t-on UNE panne en moyenne ?",
    options: ["Une panne tous les 50 ans", "Environ 1 panne toutes les 1h15, soit ~19 pannes par jour", "Jamais, le MTBF garantit l'absence de panne", "Une panne par siècle"],
    answer: 1,
    explain: "MTBF = moyenne probabiliste, pas une garantie. À l'échelle : 10 000 × 4 = 40 000 disques → 1 panne toutes les ~1h15 → la panne devient une tâche récurrente, gérée automatiquement." },
  { id: "fail2", ch: "failures", type: "vf",
    q: "Dans un système distribué, la panne d'un composant individuel doit être considérée comme un chemin « normal » : le code doit la gérer partout (retry, health check, re-soumission au scheduler), et l'architecture globale doit y résister.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "« Failure is not exceptional, is a normal path ». Composant individuel : FAIL normal. Architecture distribuée : RESILIENT. On ne lance pas manuellement sur un serveur précis, on soumet au scheduler qui alloue et réessaie." },
  { id: "fail3", ch: "failures", type: "qcm",
    q: "« Pet vs Cattle » : que signifient ces deux métaphores pour les serveurs d'un cluster ?",
    options: [
      "Pet = serveur nommé, choyé, réparé individuellement ; Cattle = serveurs anonymes (id = numéro), interchangeables, qu'on remplace au lieu de réparer",
      "Pet = petit serveur, Cattle = gros serveur",
      "Pet = nœud ZooKeeper, Cattle = DataNode",
      "Il n'y a pas de différence, ce sont deux synonymes"
    ],
    answer: 0,
    explain: "Cattle ≥ 1000 : anonymes, interchangeables. Infrastructure immutable : on ne répare pas une VM en place, on la drop et on la recrée (idem pour le software : on ajoute/retire des serveurs au cluster sans topologie codée en dur)." },
  { id: "fail4", ch: "failures", type: "multi",
    q: "Si un composant a une probabilité de 0,01 de tomber en panne aujourd'hui, quelles probabilités obtient-on en le dupliquant (pannes indépendantes) ?",
    options: [
      "2 composants qui tombent en même temps : 0,01 × 0,01 = 0,0001 (1e-4)",
      "3 composants qui tombent en même temps : 0,01³ = 0,000001 (1e-6)",
      "La duplication ne change rien à la probabilité de panne",
      "2 composants qui tombent : 0,01 + 0,01 = 0,02"
    ],
    answer: [0, 1],
    explain: "Dupliquer un composant failable réduit la proba de panne système : 1e-2 → 1e-4 → 1e-6… à condition que le système fonctionne encore avec 1 composant sur 2, et que les pannes ne soient PAS corrélées." },
  { id: "fail5", ch: "failures", type: "qcm",
    q: "L'accident d'Ariane 501 illustre quel piège de la redondance ?",
    options: [
      "Une panne matérielle simultanée sur les 2 calculateurs",
      "Des pannes CORRÉLÉES : les 2 hardwares indépendants exécutaient le MÊME logiciel, qui a levé la même exception d'overflow au même milliseconde → les 2 sont tombés ensemble",
      "Une panne du réseau entre les 2 calculateurs",
      "Un disque dur défectueux des deux côtés"
    ],
    answer: 1,
    explain: "Leçon d'Ariane 501 : la redondance matérielle ne suffit pas contre les erreurs corrélées (même bug logiciel). Il faut 2 hardwares + 2 logiciels indépendants. Autre exemple de corrélation : une alimentation électrique commune = SPOF pour tout le système." },
  { id: "fail6", ch: "failures", type: "multi",
    q: "Quels éléments sont des exemples de SPOF (Single Point Of Failure) cités dans le cours ?",
    options: [
      "L'alimentation électrique commune à tous les serveurs (panne corrélée : tout tombe)",
      "Une base de données / état partagé unique derrière des serveurs « HA »",
      "Le réseau entre les composants",
      "Un seul disque dur dans un serveur isolé"
    ],
    answer: [0, 1, 2],
    explain: "« NO SPOF : duplicate everything ». Mais tout ce qui est entre les composants peut être un SPOF : réseau, alimentation électrique, base partagée (shared state). D'où la réplication + dispatch vers les composants sains (retry/detect)." },
  { id: "fail7", ch: "failures", type: "qcm",
    q: "Pour élire un leader dans un cluster, quelles règles le cours énonce-t-il ?",
    options: [
      "Il suffit qu'un nœud se déclare leader, sans consulter les autres",
      "Il faut un quorum > 50% de participation et un nombre IMPAIR de votants (3, 5, 7…) ; 0 leader = rien ne marche, ≥2 leaders = split-brain/conflits",
      "Toujours 2 nœuds, un actif et un standby, sans quorum",
      "Le leader est désigné au hasard parmi les nœuds"
    ],
    answer: 1,
    explain: "Élection : quorum de >50% obligatoire (sinon 2 candidats à 50% peuvent chacun croire avoir la majorité → split-brain). Nombre impair de nœuds (3,5,7). Split-brain = partition réseau → 2 clusters isolés avec chacun 1 leader, données divergentes. 0 leader = indisponible." },
  { id: "fail8", ch: "failures", type: "qcm",
    q: "Le théorème CAP dit qu'on ne peut choisir que 2 propriétés parmi 3. Lesquelles ? Et ZooKeeper est plutôt… ?",
    options: [
      "Consistency, Availability, Partition tolerance → ZooKeeper = CP (cohérent + tolérant au partitionnement, pas toujours disponible)",
      "Cost, Availability, Performance → ZooKeeper = AP",
      "Capacity, Accuracy, Privacy → ZooKeeper = CA",
      "Consistency, Availability, Partition tolerance → ZooKeeper = AP (toujours disponible)"
    ],
    answer: 0,
    explain: "CAP : choisir 2 parmi Cohérence, Disponibilité, Tolérance au partitionnement. ZooKeeper = CP : toutes les écritures sont sérialisées sur le leader et répliquées sur un quorum avant commit ; en cas de partition, il sacrifie la disponibilité (« Not A »). « Eventually consistent » = pas toujours cohérent, mais cohérent à la fin." },
  { id: "fail9", ch: "failures", type: "multi",
    q: "Quelles caractéristiques décrivent ZooKeeper ?",
    options: [
      "Petit sous-système de coordination de 3, 5 ou 7 nœuds (N serveurs → N+3 connexions, au lieu de N×(N−1)/2)",
      "Store hiérarchique de key=value appelé znodes, avec ephemeral znodes (liés à la session) et watches (listen) — ex : service discovery via /servers/*",
      "Toutes les données en mémoire (+ WAL), écritures sérialisées sur le leader + quorum : ce n'est PAS une BDD généraliste, juste pour les petites données critiques mostly-read",
      "Une base de données généraliste pouvant stocker des pétaoctets"
    ],
    answer: [0, 1, 2],
    explain: "ZooKeeper : « coordinating distributed systems is a zoo ». ZNode hiérarchique, EphemeralZNode pour les sessions actives, Watch pour écouter. CP, pas disponible en cas de perte de quorum. Alternatives : etcd (cœur de Kubernetes), Consul, Redis. Kafka 3 n'utilise plus ZK." },
  { id: "fail10", ch: "failures", type: "qcm",
    q: "Le sharding (ServerId = Id mod N)…",
    options: [
      "Ne fonctionne que pour les requêtes avec un ID connu (pas pour les recherches/full scans), scale linéairement, mais redimensionner N impose de re-shuffler TOUTES les données",
      "Fonctionne aussi bien pour les full scans que pour les recherches par ID",
      "Ne scale pas au-delà de 3 serveurs",
      "Est impossible à combiner avec la réplication"
    ],
    answer: 0,
    explain: "Sharding = choisir le serveur responsable à partir de l'Id (règle partagée client/serveur, ex Id mod 3). Pros : scale linéaire. Cons : uniquement pour les requêtes par ID ; redimensionner = re-shuffle complet. On peut combiner avec master/replica par shard (ex : HDFS, HBase, ElasticSearch)." },
  { id: "fail11", ch: "failures", type: "qcm",
    q: "Quelles indisponibilités annuelles correspondent aux SLA suivants ?",
    options: [
      "99,99% (4 nines) = 52 min 35 s/an ; 99,999% (5 nines) = 5 min 15 s/an ; 99,9999% (6 nines) = 31 s/an",
      "99,99% = 1 jour/an ; 99,999% = 1h/an",
      "99,99% = 8 s/an",
      "Toutes ces SLA sont équivalentes en pratique"
    ],
    answer: 0,
    explain: "99,99% : 8 s/jour, 52 min 35 s/an. 99,999% (« 5 nines ») : 5 min 15 s/an. 99,9999% : 31 s/an. Chaque neuf gagné divise l'indisponibilité par 10 — et coûte très cher." },
  { id: "fail12", ch: "failures", type: "vf",
    q: "Le chaos engineering (initié par Netflix) consiste à tuer aléatoirement des processus, VMs ou même des datacenters en production pour vérifier que le système résiste (« kill and see »).",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Prouver qu'un système ne fail pas est très difficile ; il est facile de tester en tuant et en regardant. Chaos engineering = tuer aléatoirement. À répéter après chaque changement. Ce n'est pas un test exhaustif." },
  { id: "fail13", ch: "failures", type: "qcm",
    q: "Scénario catastrophe d'élection de leader : un leader subit un « Full GC stop-the-world » de 30 s. Que se passe-t-il ?",
    options: [
      "Rien, le GC est transparent pour le réseau",
      "30 s > timeout des health checks (défaut ~30 s) → le leader est déclaré unhealthy, perd son élection, un autre nœud est élu… et le même phénomène peut recommencer en boucle",
      "Le leader gagne automatiquement une nouvelle élection",
      "Le cluster élit 2 leaders simultanément en secours"
    ],
    answer: 1,
    explain: "Boucle catastrophique : GC stop-the-world ≥ timeout socket/health-check → perte du leadership → nouvelle élection → le nouveau leader subit la même charge → re-élection… Leçon : surveiller les pauses GC des nœuds « leader » (ex : JVM mal tunée)." },
  /* ---------------- Chapitre 4 : Écosystème Hadoop ---------------- */
  { id: "hadoop1", ch: "hadoop", type: "multi",
    q: "Quelles affirmations décrivent correctement HDFS ?",
    options: [
      "Architecture 1 NameNode (métadonnées) + N DataNodes (blocs de données)",
      "1 fichier = N blocs de 128 Mo par défaut, répliqués RF=3, rack-aware (1 réplique dans le même rack, au moins 1 dans un autre rack)",
      "API append-only : 1 seul writer exclusif par fichier ; seek autorisé uniquement en lecture",
      "Chaque fichier fait exactement 1 bloc de 64 Ko"
    ],
    answer: [0, 1, 2],
    explain: "HDFS : NameNode gère les métadonnées (owner, droits, liste des blocs), DataNodes stockent les blocs physiques. Bloc = 128 Mo par défaut, découpé en paquets de 64 Ko (chunks 512 o + checksum 4 o). Écriture : append-only, 1 writer. RF=3 rack-aware pour tolérer la panne d'un rack." },
  { id: "hadoop2", ch: "hadoop", type: "qcm",
    q: "Pourquoi le NameNode est-il considéré comme LE bottleneck (et SPOF) de HDFS ?",
    options: [
      "Parce qu'il stocke les données des utilisateurs",
      "Parce qu'il maintient TOUTES les métadonnées (noms de fichiers/dirs) en mémoire JVM (~4 ko/fichier) : > 200 M de fichiers → JVM avec -Xmx > 200 Go ; crash/GC/corruption = système OFF",
      "Parce qu'il fait les calculs MapReduce",
      "Parce qu'il est le seul à pouvoir lire les blocs"
    ],
    answer: 1,
    explain: "Toutes les opérations de métadonnées passent par le NameNode, qui les garde en mémoire JVM (FsImage + FsEdit). C'est pourquoi : haute dispo avec 2 NameNodes actif/standby (réplication FsEdit), et surtout HDFS déteste les petits fichiers (> 200 M fichiers = NameNode énorme)." },
  { id: "hadoop3", ch: "hadoop", type: "qcm",
    q: "Que se passe-t-il quand un DataNode disparaît (ou rejoint le cluster) ?",
    options: [
      "Rien, les données sont perdues définitivement",
      "Disparition : ses blocs deviennent under-replicated → le NameNode déclenche leur re-réplication. Retour : bloc-report → blocs potentiellement over-replicated → supprimés. Au démarrage, le NameNode est en « safe mode » en attendant les block-reports",
      "Le NameNode recrée automatiquement le serveur",
      "Tous les fichiers sont copiés sur bandes magnétiques"
    ],
    answer: 1,
    explain: "Le NameNode (actif) orchestre la réplication : DataNode disparu → re-réplication des blocs sous-répliqués ; DataNode qui rejoint → rapport de blocs → suppression des répliques en excès. Safe mode au démarrage tant que les block-reports ne sont pas suffisants." },
  { id: "hadoop4", ch: "hadoop", type: "multi",
    q: "Quelles sont les responsabilités de Yarn (Yet Another Resource Negotiator) ?",
    options: [
      "ResourceManager (ressources globales, files/queues hiérarchiques, scheduler capacity) + NodeManager par nœud (lance les containers) + 1 AppMaster par application (négocie les ressources, supervise)",
      "Stockage des blocs de fichiers",
      "Coordination et élection de leader (rôle de ZooKeeper/etcd)",
      "Gestion des métadonnées de fichiers (rôle du NameNode)"
    ],
    answer: [0],
    explain: "Yarn = ressource virtuelle de CALCUL : le client soumet l'app au RM, l'AppMaster négocie des containers auprès des NodeManagers. Files hiérarchiques : queues enfants dont les capacités somment à 100%, avec capacité max, preemption possible. Yarn ne gère ni le stockage ni la coordination." },
  { id: "hadoop5", ch: "hadoop", type: "qcm",
    q: "Yarn vs Kubernetes : la différence fondamentale selon le cours ?",
    options: [
      "Yarn ne supporte que Java, K8s que Docker",
      "Yarn est impératif (on appelle le système pour lancer une appli) avec une BDD relationnelle derrière ; Kubernetes est déclaratif (on déclare l'état cible dans etcd, des operators le réalisent)",
      "Kubernetes ne fait pas de files d'attente",
      "Yarn est plus rapide que K8s pour Spark"
    ],
    answer: 1,
    explain: "Yarn : API Protobuf/HTTP, RM + NodeManager, AppMaster par appli, BDD relationnelle (Postgres), files FIFO/quota. K8s : ApiServer + etcd (kernel), kubelet, operators par type de ressource, déclaratif via kubectl apply. Pour le batch BigData sur K8s : schedulers externes Volcano ou UniKorn (files)." },
  { id: "hadoop6", ch: "hadoop", type: "multi",
    q: "Quels « --master » Spark peut-on utiliser aujourd'hui selon le cours ?",
    options: [
      "local[*] (tout en local) et standalone via spark://IP:PORT (SSH)",
      "--master yarn",
      "--master k8s://https://<k8s-apiserver> (depuis Spark 3.0)",
      "--master mesos:// (déprécié depuis Spark 3.2)"
    ],
    answer: [0, 1, 2],
    explain: "Cluster managers Spark : local, standalone (SSH), Yarn, Kubernetes (k8s://, depuis 3.0, « future »), Mesos (déprécié en 3.2.0, « past »). Tendance actuelle : Kubernetes." },
  { id: "hadoop7", ch: "hadoop", type: "qcm",
    q: "À quoi sert Apache Oozie dans l'écosystème Hadoop ?",
    options: [
      "Stockage distribué de fichiers",
      "Orchestrateur : coordinators CRON (ex « 2 */5 MON-FRI * * * ») et workflows (workflow.xml d'actions shell/spark/HDFS) lancés sur Yarn, avec packaging simple — mais SANS data lineage ni déclencheur sur arrivée de données",
      "Moteur de requêtes SQL distribué",
      "Service de coordination à la place de ZooKeeper"
    ],
    answer: 1,
    explain: "Oozie complète les manques de Yarn : planification périodique (CRON), workflows entre actions, lancement simple de jobs. Limites : pas de data lineage, pas de trigger « données arrivées » (d'où OpenLineage/Marquez), UI peu pratique. Alternative pour lancer des jobs Spark simples : Livy (REST, batchs ou sessions interactives)." },
  { id: "hadoop8", ch: "hadoop", type: "vf",
    q: "HiveServer2 (accès JDBC/Thrift aux données Hive) est déprécié : on utilise plutôt le ThriftServer de Spark, compatible SQL, plus rapide et moins gourmand en ressources.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "HiveServer2 : buggy, fuites de connexions/threads, lent, très consommateur. Spark ThriftServer : compatible SQL/API Hive, plus rapide, moins de ressources. Le Hive MetaStore (DDL uniquement, derrière une BDD type Postgres) reste lui bien vivant et est supporté par Spark via l'ExternalCatalog." },
  { id: "hadoop9", ch: "hadoop", type: "qcm",
    q: "Dans l'architecture Hadoop, à quoi sert ZooKeeper (et quelles sont ses alternatives modernes citées) ?",
    options: [
      "Stockage des données utilisateurs → alternative : HDFS",
      "Coordination distribuée (élection de master, métadonnées de topologie, service discovery) → alternatives : etcd (cœur de Kubernetes), Consul ; Kafka 3 n'en a plus besoin",
      "Ordonnancement des jobs → alternative : Kubernetes",
      "Requêtage SQL → alternative : Spark SQL"
    ],
    answer: 1,
    explain: "ZooKeeper = petit cluster de coordination (3/5/7 nœuds) pour l'élection de master et les métadonnées de service. Dans l'écosystème moderne : etcd pour K8s, Consul, et Kafka 3 fonctionne sans ZooKeeper. Spark lui-même ne l'utilise pas directement." },

  /* ---------------- Chapitre 7 : MetaStore & SQL ---------------- */
  { id: "meta1", ch: "metastore", type: "vf",
    q: "Le Hive MetaStore ne contient QUE des définitions DDL (métadonnées) : nom de table, schéma et types des colonnes, URL de location HDFS, format de fichier (parquet/orc/avro/csv/json), partitions — jamais les données elles-mêmes.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Le MetaStore = « vue logique » : nom SQL → location HDFS + format + schéma (avec champs nested struct/array/map possibles). Les données restent dans HDFS. Il est adossé à une BDD relationnelle (ex Postgres) et exposé en Protobuf/HTTP. Spark y accède via son ExternalCatalog (JDBC ou API)." },
  { id: "meta2", ch: "metastore", type: "qcm",
    q: "EXTERNAL TABLE vs MANAGED TABLE : quelle différence au DROP ?",
    options: [
      "Aucune, les deux suppriment les fichiers",
      "EXTERNAL : les données existent indépendamment du metastore, le DROP ne supprime PAS les fichiers HDFS (et il est absurde de faire ALTER sur les colonnes) ; MANAGED : le DROP supprime tous les fichiers → à éviter en datalake",
      "EXTERNAL supprime les fichiers, MANAGED non",
      "MANAGED est obligatoire pour Spark"
    ],
    answer: 1,
    explain: "En datalake on utilise EXTERNAL TABLE (LOCATION explicite) : le metastore ne « possède » pas les données. MANAGED : à la création un dir vide est créé ({db.location}/{table}), au drop tous les fichiers sont supprimés. Règle du cours : ne pas utiliser MANAGED." },
  { id: "meta3", ch: "metastore", type: "qcm",
    q: "Une partition Hive, c'est physiquement… ? Et comment l'enregistre-t-on ?",
    options: [
      "Une colonne spéciale dans chaque fichier parquet → rien à enregistrer",
      "Un répertoire « col=valeur » (ex /data/table1/col1=a/col2=1) ; il faut l'ajouter EXPLICITEMENT (ALTER TABLE … ADD PARTITION) ou via MSCK REPAIR TABLE, sinon le scan ne voit rien",
      "Un fichier nommé _PARTITION dans le dossier racine",
      "Une table à part dans le metastore, sans impact sur HDFS"
    ],
    answer: 1,
    explain: "PARTITIONED BY (col1, col2) → arborescence de répertoires /col1=a/col2=1/ contenant les fichiers. Les partitions doivent être déclarées explicitement (ADD PARTITION) ou découvertes par MSCK REPAIR (rescan complet, inefficace). discover.partitions=true = polling inefficace du metastore toutes les 10 min → mauvaise idée." },
  { id: "meta4", ch: "metastore", type: "vf",
    q: "Le partition pruning : si la requête filtre sur une colonne de partition (WHERE promo=2020), Spark ne scanne que les fichiers de /data/student/promo=2020/** et saute les autres répertoires.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Optim n°3 : condition sur colonne de partition → scan uniquement des répertoires concernés, skip des autres. Attention : une partition sert surtout de granularité d'overwrite (scope de batch), pas d'abord à accélérer la recherche — le predicate push-down de Parquet est souvent meilleur. Ne pas dépasser ~2 niveaux de partition." },
  { id: "meta5", ch: "metastore", type: "multi",
    q: "Quelles affirmations sur les écritures SQL dans une table Hive/Spark sont correctes ?",
    options: [
      "INSERT INTO ajoute de nouveaux fichiers en préservant les existants",
      "INSERT OVERWRITE recharge tous les fichiers, écrit les nouveaux, supprime les anciens",
      "Par défaut (Spark 3.x) : PAS de UPDATE, ni UPSERT, ni MERGE — seulement via extensions DeltaLake/Iceberg",
      "Un UPDATE modifie les lignes en place dans les fichiers existants"
    ],
    answer: [0, 1, 2],
    explain: "DML : INSERT INTO = append de fichiers ; INSERT OVERWRITE (ou DELETE) = recréation complète. UPDATE/UPSERT/MERGE : non supportés nativement en Spark 3.x (DeltaLake/Iceberg requis). Jamais de modification en place : un update = nouveau fichier." },
  { id: "meta6", ch: "metastore", type: "qcm",
    q: "Pourquoi un simple INSERT OVERWRITE d'une partition peut-il créer un problème de « petits fichiers » ?",
    options: [
      "Parce que Spark écrit toujours exactement 1 fichier",
      "Parce qu'après un shuffle le dataset a spark.sql.shuffle.partitions = 200 partitions par défaut → jusqu'à 200 nouveaux fichiers dans la partition, et HDFS déteste les trop nombreux petits fichiers",
      "Parce que HDFS compresse chaque fichier en .gz non splittable",
      "Parce que le metastore limite à 200 fichiers par table"
    ],
    answer: 1,
    explain: "Après un shuffle, 200 partitions → 200 fichiers écrits dans la partition cible. HDFS (NameNode en mémoire, ~4 ko/métadonnée par fichier) déteste ça. Solution : repartition(n)/coalesce(n) avant write, ou ajuster spark.sql.shuffle.partitions." },
  { id: "meta7", ch: "metastore", type: "multi",
    q: "Quelles sont les « 5 optimisations » de lecture récapitulées dans le cours (SQL → fichiers Hadoop/Parquet) ?",
    options: [
      "1/ schéma typé + encodage binaire + dictionnaire/compression (vs CSV/JSON/XML schema-less)",
      "2/ format de fichier splittable en blocs (distribué)",
      "3/ partition pruning (sauter des répertoires via le metastore)",
      "4/ column pruning (format columnar : seek + lecture des seules colonnes utiles)",
      "5/ predicate push-down (sauter des row groups via statistiques min/max + bloom filters)",
      "6/ index B-Tree sur chaque colonne"
    ],
    answer: [0, 1, 2, 3, 4],
    explain: "Recap du cours : 1/ typed schema/binary/dictionary+compression, 2/ splittable blocks, 3/ partition pruning, 4/ column pruning, 5/ PPD (stats + bloom). Pas de B-Tree en Big Data ! Volume conseillé : ~1500 partitions OK (5 ans de batchs journaliers), fichiers de plusieurs Go OK, parquet.block.size peut être réduit (16/32 Mo) pour plus de dictionary encoding et de PPD." },
  { id: "meta8", ch: "metastore", type: "qcm",
    q: "Hive MetaStore et HiveServer2, c'est la même chose.",
    options: ["Vrai", "Faux"],
    answer: 1,
    explain: "FAUX. MetaStore = métadonnées DDL uniquement (tables, schémas, partitions, locations), adossé à une BDD relationnelle, exposé en Protobuf/HTTP (WebHCat). HiveServer2 = serveur de requêtes (Thrift/JDBC) qui exécute les requêtes Hive — déprécié, remplacé par le ThriftServer de Spark." },
  /* ---------------- Chapitre 8 : Parquet ---------------- */
  { id: "parq1", ch: "parquet", type: "vf",
    q: "Parquet est un format COLUMNAR : les valeurs d'une même colonne sont stockées contiguës, ce qui permet le « column pruning » (seek pour sauter les colonnes inutiles, lecture des seules colonnes demandées) et un lecteur vectorisé ~9x plus rapide.",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Columnar vs row (CSV/JSON/Avro) : pour SELECT col2, colP, le row-store force une lecture séquentielle de tout (skips + petites lectures unitaires), le columnar fait 2 seek + 2 lectures de tableaux. Bonus : alignement mémoire et exécution vectorisée (SIMD), ~9x plus rapide." },
  { id: "parq2", ch: "parquet", type: "qcm",
    q: "Comment un lecteur trouve-t-il le schéma et les métadonnées d'un fichier Parquet ?",
    options: [
      "En lisant l'en-tête (header) du fichier",
      "En lisant la FIN du fichier : taille du fichier → 4 derniers octets = taille du footer → lecture du footer [len−F, len] contenant schéma, offsets des row groups et statistiques",
      "En scannant tout le fichier ligne par ligne",
      "En interrogeant le Hive MetaStore obligatoirement"
    ],
    answer: 1,
    explain: "Footer, pas header : pour le lecteur, pas de surcoût (3 appels : longueur, 4 derniers octets, footer) ; pour l'écrivain, pratique pour streamer les lignes et n'écrire les métadonnées qu'à la fin (flush du footer). Footer typiquement ≤ 50 ko." },
  { id: "parq3", ch: "parquet", type: "multi",
    q: "Quelles affirmations sur la « splittabilité » des fichiers sont correctes ?",
    options: [
      "Un fichier Parquet est découpé en row groups (~128 Mo = parquet.block.size = spark.sql.files.maxPartitionBytes), chacun avec son offset dans le footer",
      "1 row group ≈ 1 partition Spark par défaut ; un gros fichier peut être découpé (file split) en plusieurs partitions à des offsets de row groups",
      ".gz (gzip) N'est PAS splittable : 1 seul thread devra tout lire/décompresser (ex : CSV 3,2 Go → .gz 660 Mo lu par 1 thread, ~8x plus lent sur 8 cœurs)",
      "Parquet compressé en snappy reste splittable car la compression s'applique par chunk de colonne"
    ],
    answer: [0, 1, 2, 3],
    explain: "Splittable = distribuable. Parquet (snappy/lz4) : oui, par row group. CSV/JSON texte : splittable en lignes (~128 Mo, le lecteur ignore la première ligne partielle). .gz : NON splittable → 1 partition = 1 thread. Spark RDD partition = metastore partition × fichiers × blocs." },
  { id: "parq4", ch: "parquet", type: "qcm",
    q: "Quelles compressions Parquet existent, et pour quel compromis ?",
    options: [
      "Uniquement gzip, le plus courant",
      "snappy (rapide), gzip/.gz (meilleur ratio mais lent), lz4 (compromis vitesse/ratio) — appliquées par chunk de colonne, le fichier reste splittable",
      "Aucune, Parquet ne compresse pas",
      "Uniquement zstd, obligatoire depuis Parquet 1.13"
    ],
    answer: 1,
    explain: "snappy = focus vitesse ; .gz = focus taille (mais PAS splittable) ; lz4 = compromis. La compression se fait par chunk de colonne, donc un fichier parquet compressé reste splittable par row group." },
  { id: "parq5", ch: "parquet", type: "multi",
    q: "Quels encodages de données Parquet utilise-t-il ?",
    options: [
      "RLE (Run-Length Encoding) pour les valeurs répétées (ex : « aaaaa » → 5 a)",
      "Dictionary encoding pour les colonnes à faible cardinalité (valeurs remplacées par des index ; utilisé par défaut si le dictionnaire tient ~≤ 1 Mo par chunk)",
      "Delta encoding pour les séries numériques (base + deltas, ex 10007, 10003… → BaseValue + deltas)",
      "Varint + ZigZag pour les entiers (petites valeurs sur 1 octet ; −1 → 1, +1 → 2…)",
      "UTF-8 uniquement, comme un CSV"
    ],
    answer: [0, 1, 2, 3],
    explain: "Encodages Parquet : RLE, dictionary (parquet.dictionary.page.size = 1 Mo par défaut ; petits row groups → plus de dictionnaires), delta, varint+ZigZag (les valeurs dans [−128,127] tiennent sur 1 octet), + definition/repetition levels pour le nested. Une colonne constante de « 0 » sur des milliards de lignes ne prend que ~100 octets par row group." },
  { id: "parq6", ch: "parquet", type: "qcm",
    q: "Le predicate push-down (PPD) avec statistiques min/max : si on cherche col3 = value3 et que le row group a min(col3)=m, max(col3)=M, que fait Spark si value3 < m ou value3 > M ?",
    options: [
      "Il lit quand même le row group pour être sûr",
      "Il SAUTE le row group (aucun match possible, hors nulls à vérifier pour la sémantique SQL) — avec possiblement des faux positifs si value3 est dans [m, M]",
      "Il lit uniquement le footer",
      "Il renvoie une erreur"
    ],
    answer: 1,
    explain: "Stats par colonne et par row group dans le footer : si la valeur est hors [min, max] → skip du row group (vérifier quand même les nulls pour la sémantique SQL). Si dans [min,max] → lecture (peut être un faux positif). D'où l'intérêt d'écrire des fichiers TRIÉS avec des blocs plus petits : min/max plus resserrés → plus de blocs skippés." },
  { id: "parq7", ch: "parquet", type: "qcm",
    q: "À quoi sert le bloom filter dans Parquet ?",
    options: [
      "À compresser les colonnes de texte",
      "Test d'appartenance probabiliste : k hashes de la valeur testés contre un masque de bits ; si un bit manque → la valeur est ABSENTE (pas de faux négatif) ; faux positifs possibles avec taux ≈ (1 − e^(−kn/m))^k",
      "À trier les row groups",
      "À chiffrer le footer"
    ],
    answer: 1,
    explain: "Bloom filter : union de masques de hachage. (h & bloom) == h pour chacun des k hashes → « peut-être présent » (faux positifs possibles), sinon « certainement absent » → skip du row group. Utilisé aussi avec le dictionary encoding (si 'value3' n'est pas dans le dictionnaire du chunk → skip)." },
  { id: "parq8", ch: "parquet", type: "vf",
    q: "Parquet est immutable : une fois le footer flushé, on ne modifie plus le fichier. « Updater » une ligne = recopier le fichier entier (copy-on-write), ou passer par Iceberg (snapshots/manifests façon Git, avec time travel).",
    options: ["Vrai", "Faux"],
    answer: 0,
    explain: "Immutable + versionning par ajout de fichiers dans les répertoires de partition Hive, ou via Iceberg (catalog → manifest list → manifests → data files ; snapshot 1, snapshot 2… les vieux fichiers non référencés restent visibles en time travel). Schéma dans le footer : ajout de colonne OK (null), renommage = drop+add, conflit de type = erreur (ou widening si compatible)." },
  { id: "parq9", ch: "parquet", type: "qcm",
    q: "mergeSchema=true dans spark.read : à quoi sert-il et quel est son coût ?",
    options: [
      "À forcer la lecture du schéma du metastore uniquement — gratuit",
      "À lire les footers de TOUS les fichiers et fusionner leurs schémas (colonnes manquantes → null) : plus lent mais exhaustif pour l'évolution de schéma ; par défaut seul le dernier schéma est lu",
      "À compresser les fichiers — gratuit",
      "À supprimer les colonnes null — destructeur"
    ],
    answer: 1,
    explain: "Par défaut Spark lit le schéma d'un seul fichier (le dernier). mergeSchema=true lit tous les footers et fusionne : id, name + email → schéma complet avec null. Coût : lecture de tous les footers → plus lent, mais exhaustif. Alternative : coercition via le schéma du metastore (match par nom, pas par position ; colonne manquante → null, extra → ignorée, type compatible → cast)." },
  { id: "parq10", ch: "parquet", type: "multi",
    q: "Quelles bonnes pratiques d'ÉCRITURE de fichiers Parquet le cours recommande-t-il (« write once, read many » : optimiser l'écriture pour les lectures futures) ?",
    options: [
      "repartition(n) ou coalesce(n) avant write pour éviter les « too many small files » (1 fichier = 1 partition)",
      "sortWithinPartitions(colA, colB, …, colID) pour que les statistiques min/max des row groups soient compactes → meilleur PPD",
      "Ajuster parquet.block.size (ex 16/32 Mo au lieu de 128 Mo) : plus de dictionnaires et de PPD, au prix de plus de partitions",
      "Laisser spark.shuffle.partitions=200 et écrire 200 petits fichiers par partition, HDFS adore ça"
    ],
    answer: [0, 1, 2],
    explain: "Write optimisé : ds.repartition(n).sortWithinPartitions(...).option(\"parquet.block.size\", 32*MEGA).write… Le tri améliore les stats min/max (blocs skippés au read). Éviter les petits fichiers : HDFS/NameNode et le ratio data/métadonnées (footer non compressé) pénalisent Parquet sur les petits fichiers. Voir aussi bucketBy(…)." },
  { id: "parq11", ch: "parquet", type: "vf",
    q: "Parquet est très efficace même pour de très petits fichiers (quelques ko), grâce à son footer compressé.",
    options: ["Vrai", "Faux"],
    answer: 1,
    explain: "FAUX : le footer (schéma + métadonnées) n'est PAS compressé et pèse typiquement jusqu'à ~50 ko — sur un petit fichier, le ratio data/métadonnées est mauvais. Parquet vise les gros fichiers (blocs de ~128 Mo, fichiers de plusieurs Go)." }
];
