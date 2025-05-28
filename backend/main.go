package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// --- Modele Danych ---

type User struct {
	ID           uint      `gorm:"primaryKey"`
	Username     string    `gorm:"unique"`
	Email        string    `gorm:"unique;not null"`
	Password     string    `gorm:"not null"`
	CreatedAt    time.Time
	Servers      []*Server `gorm:"many2many:user_servers;"` // Użytkownik może należeć do wielu serwerów
	OwnedServers []*Server `gorm:"foreignKey:OwnerID"`      // Serwery, których użytkownik jest właścicielem
}

type Server struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"not null"`
	CreatedAt time.Time
	OwnerID   uint      `gorm:"not null"` // ID użytkownika, który jest właścicielem serwera
	Owner     User      `gorm:"foreignKey:OwnerID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"` // Dodane constrainty dla relacji
	Members   []*User   `gorm:"many2many:user_servers;"`                                           // Członkowie serwera
	Channels  []Channel `gorm:"foreignKey:ServerID"`                                               // Kanały należące do tego serwera
}

type Channel struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"not null"`
	Type      string    `gorm:"not null;default:'text'"` // np. "text", "voice"
	ServerID  uint      `gorm:"not null"`
	CreatedAt time.Time
	// Server    Server    `gorm:"foreignKey:ServerID"` // Opcjonalnie
}

// --- Konfiguracja ---

type Config struct {
	Port              string
	JWTSecret         []byte
	CorsAllowedOrigin string
	DatabaseURL       string
}

type Message struct {
    ID        uint      `gorm:"primaryKey" json:"ID"`
    Content   string    `gorm:"not null"   json:"Content"`
    CreatedAt time.Time `json:"CreatedAt"`
    UserID    uint      `gorm:"not null"   json:"UserID"`
    User      User      `gorm:"foreignKey:UserID" json:"User"` 
    ChannelID uint      `gorm:"not null"   json:"ChannelID"`
}
// W main(): db.AutoMigrate(&User{}, &Server{}, &Channel{}, &Message{}) // Dodaj Message


func LoadConfig() Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, proceeding with OS environment variables")
	}

	port := os.Getenv("GO_SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "mydiscordapp.db" // Zmieniono nazwę na zgodną z Twoim projektem
	}
	return Config{
		Port:              port,
		JWTSecret:         []byte(jwtSecret),
		CorsAllowedOrigin: corsOrigin,
		DatabaseURL:       dbURL,
	}
}

// --- Middleware JWT ---

func jwtMiddleware(jwtSecret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}
		tokenString := ""
		if len(authHeader) > 7 && strings.ToUpper(authHeader[0:7]) == "BEARER " {
			tokenString = authHeader[7:]
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Malformed token, 'Bearer ' prefix missing"})
			c.Abort()
			return
		}
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})
		if err != nil {
			log.Printf("Token parsing error: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			if exp, ok := claims["exp"].(float64); ok {
				if int64(exp) < time.Now().Unix() {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
					c.Abort()
					return
				}
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims (exp missing)"})
				c.Abort()
				return
			}
			c.Set("user_id", claims["user_id"])
			c.Set("username", claims["username"])
			c.Next()
		} else {
			log.Println("Invalid token or claims issue")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
		}
	}
}

// --- Zmienna globalna dla instancji bazy danych (uproszczenie) ---
var db *gorm.DB

// --- Handlery API ---

func createServerHandler(c *gin.Context) {
	var jsonInput struct {
		Name string `json:"name" binding:"required,min=3,max=100"`
	}

	if err := c.ShouldBindJSON(&jsonInput); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server name: " + err.Error()})
		return
	}

	userIDClaim, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}
	userIDFloat, ok := userIDClaim.(float64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}
	ownerID := uint(userIDFloat)

	server := Server{
		Name:      jsonInput.Name,
		OwnerID:   ownerID,
		CreatedAt: time.Now(),
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&server).Error; err != nil {
			return err
		}

		var owner User
		if err := tx.First(&owner, ownerID).Error; err != nil {
			// Jeśli użytkownik nie istnieje, to jest problem z logiką JWT lub bazą danych
			log.Printf("Owner user with ID %d not found during server creation", ownerID)
			return errors.New("owner user not found")
		}
		// Dodanie właściciela do listy członków serwera
		if err := tx.Model(&server).Association("Members").Append(&owner); err != nil {
			log.Printf("Failed to add owner as member to server %d: %v", server.ID, err)
			return err
		}

		defaultChannel := Channel{
			Name:      "general",
			Type:      "text",
			ServerID:  server.ID,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&defaultChannel).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		log.Printf("Error creating server transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create server"})
		return
	}

	// Załaduj dane powiązane, aby zwrócić pełny obiekt serwera
	// Upewnij się, że GORM poprawnie ładuje te dane. Może być konieczne jawne Preload.
	var createdServer Server
	if err := db.Preload("Owner").Preload("Members").Preload("Channels").First(&createdServer, server.ID).Error; err != nil {
		log.Printf("Error fetching created server with associations: %v", err)
		// Zwróć serwer bez pełnych asocjacji, jeśli ładowanie zawiedzie, lub zwróć błąd
		c.JSON(http.StatusCreated, gin.H{
			"message": "Server created successfully, but failed to load full details",
			"server_id": server.ID,
			"server_name": server.Name,
		})
		return
	}


	c.JSON(http.StatusCreated, gin.H{
		"message": "Server created successfully",
		"server":  createdServer,
	})
}
func getServersForUserHandler(c *gin.Context) {
    userIDClaim, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
        return
    }
    userIDFloat, ok := userIDClaim.(float64)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
        return
    }
    currentUserID := uint(userIDFloat)

    var user User
    // Pobierz użytkownika wraz z jego serwerami (do których należy jako członek)
    // Użyj Preload, aby załadować powiązane serwery.
    // GORM automatycznie użyje tabeli user_servers dzięki definicji many2many.
    if err := db.Preload("Servers").First(&user, currentUserID).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        log.Printf("Error fetching user with servers: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user's servers"})
        return
    }

    // Możesz też chcieć pobrać serwery, których jest właścicielem, jeśli to inna lista
    // db.Preload("OwnedServers").First(&user, currentUserID)

    c.JSON(http.StatusOK, gin.H{"servers": user.Servers})
}

func getChannelsHandler(c *gin.Context) {
	var channels []Channel
	// Załóżmy, że na razie pobieramy wszystkie kanały, bez filtrowania po serwerze
	// W przyszłości, gdy będziesz miał aktywny serwer, będziesz tu filtrował po ServerID
	if err := db.Order("created_at asc").Find(&channels).Error; err != nil {
		log.Printf("Error fetching channels: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch channels"})
		return
	}

	if channels == nil { // GORM zwraca nil slice jeśli nic nie znajdzie, a nie pusty slice
		channels = []Channel{} // Zwróć pustą tablicę zamiast null w JSON
	}

	c.JSON(http.StatusOK, gin.H{"channels": channels})
}

func getChannelsForServerHandler(c *gin.Context) {
	// Pobierz serverId z parametrów ścieżki
	serverIdStr := c.Param("serverId") // Gin odczytuje parametr ścieżki o nazwie "serverId"
	serverIdUint64, err := strconv.ParseUint(serverIdStr, 10, 32) // Konwertuj na uint64, potem na uint
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID format"})
		return
	}
	serverId := uint(serverIdUint64)

	// Sprawdź, czy użytkownik ma dostęp do tego serwera (opcjonalne, ale zalecane)
	// Możesz tu dodać logikę sprawdzającą, czy zalogowany użytkownik jest członkiem serwera o ID serverId
	// Na razie pominiemy ten krok dla uproszczenia, ale pamiętaj o nim dla bezpieczeństwa.

	var server Server
	// Pobierz serwer wraz z jego kanałami
	if err := db.Preload("Channels").First(&server, serverId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Server with ID %d not found when fetching channels", serverId)
			c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
			return
		}
		log.Printf("Error fetching server %d with channels: %v", serverId, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch server channels"})
		return
	}

	// Jeśli serwer został znaleziony, server.Channels będzie zawierać listę kanałów
	// Jeśli nie ma kanałów, server.Channels będzie pustym slice (lub nil, GORM może zwrócić nil)
	channelsToReturn := server.Channels
	if channelsToReturn == nil {
		channelsToReturn = []Channel{} // Zapewnij, że zawsze zwracasz tablicę, nawet jeśli pustą
	}

	log.Printf("Successfully fetched %d channels for server ID %d", len(channelsToReturn), serverId)
	c.JSON(http.StatusOK, gin.H{"channels": channelsToReturn}) 
}

func getChannelDetailsHandler(c *gin.Context) {
    channelIdStr := c.Param("channelId")
    channelIdUint64, err := strconv.ParseUint(channelIdStr, 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID format"})
        return
    }
    channelId := uint(channelIdUint64)

    var channel Channel
    if err := db.First(&channel, channelId).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            log.Printf("Channel with ID %d not found", channelId)
            c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
            return
        }
        log.Printf("Error fetching channel %d details: %v", channelId, err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch channel details"})
        return
    }
    log.Printf("Successfully fetched details for channel ID %d", channelId)
    c.JSON(http.StatusOK, gin.H{"channel": channel}) // Zwróć obiekt z kluczem "channel"
}

func getMessagesForChannelHandler(c *gin.Context) {
    channelIdStr := c.Param("channelId")
    channelIdUint64, err := strconv.ParseUint(channelIdStr, 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID format"})
        return
    }
    channelId := uint(channelIdUint64)

    // Sprawdź, czy kanał istnieje (opcjonalne, ale dobre)
    var channel Channel
    if err := db.First(&channel, channelId).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
        return
    }

    var messages []Message
    // Pobierz wiadomości dla kanału, posortowane od najnowszych lub najstarszych
    // WAŻNE: Preloaduj dane użytkownika (autora wiadomości)!
    if err := db.Preload("User").Where("channel_id = ?", channelId).Order("created_at asc").Find(&messages).Error; err != nil {
        log.Printf("Error fetching messages for channel %d: %v", channelId, err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
        return
    }

    if messages == nil {
        messages = []Message{}
    }
    log.Printf("Successfully fetched %d messages for channel ID %d", len(messages), channelId)
    c.JSON(http.StatusOK, gin.H{"messages": messages}) // Zwróć obiekt z kluczem "messages"
}

// Struktura dla danych wejściowych z JSON przy tworzeniu wiadomości
type CreateMessageInput struct {
    Content string `json:"content" binding:"required,min=1,max=2000"` // Dodajemy walidację
}

func postMessageHandler(c *gin.Context) {
    // Pobierz channelId z parametrów ścieżki
    channelIdStr := c.Param("channelId")
    channelIdUint64, err := strconv.ParseUint(channelIdStr, 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID format"})
        return
    }
    channelId := uint(channelIdUint64)

    // Pobierz userID z kontekstu JWT
    userIDClaim, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
        return
    }
    userIDFloat, ok := userIDClaim.(float64)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
        return
    }
    authorID := uint(userIDFloat)

    // Odczytaj treść wiadomości z ciała żądania
    var input CreateMessageInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message content: " + err.Error()})
        return
    }

    // Sprawdź, czy kanał istnieje (opcjonalne, ale dobre)
    var channel Channel
    if err := db.First(&channel, channelId).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Error verifying channel"})
        return
    }
    // TODO: W przyszłości sprawdź, czy użytkownik ma uprawnienia do pisania na tym kanale

    // Utwórz nową wiadomość
    newMessage := Message{
        Content:   input.Content,
        UserID:    authorID,
        ChannelID: channelId,
        CreatedAt: time.Now(),
    }

    // Zapisz wiadomość w bazie danych
    if err := db.Create(&newMessage).Error; err != nil {
        log.Printf("Error creating message for channel %d: %v", channelId, err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message"})
        return
    }

    // Załaduj dane użytkownika (autora), aby zwrócić pełny obiekt wiadomości
    // To jest ważne, aby frontend od razu miał dane autora nowej wiadomości
    if err := db.Preload("User").First(&newMessage, newMessage.ID).Error; err != nil {
        log.Printf("Error preloading user for new message %d: %v", newMessage.ID, err)
        // Zwróć wiadomość bez danych użytkownika lub zwróć błąd
        c.JSON(http.StatusCreated, gin.H{
            "message": "Message created successfully, but failed to load author details",
            "createdMessage": newMessage, // Zwróci wiadomość bez załadowanego User
        })
        return
    }

    log.Printf("User %d created message in channel %d", authorID, channelId)
	
    c.JSON(http.StatusCreated, gin.H{
        "message": "Message created successfully",
        "createdMessage": newMessage, // Zwróć nowo utworzoną wiadomość z danymi autora
    })
}

// --- Główna funkcja aplikacji ---
func main() {
	cfg := LoadConfig()

	// Inicjalizacja globalnej zmiennej db
	var errGorm error
	db, errGorm = gorm.Open(sqlite.Open(cfg.DatabaseURL), &gorm.Config{})
	if errGorm != nil {
		log.Fatalf("Failed to connect database: %v", errGorm)
	}

	// AutoMigrate
	errMigrate := db.AutoMigrate(&User{}, &Server{}, &Channel{}, &Message{})
	if errMigrate != nil {
		log.Fatalf("Failed to migrate database: %v", errMigrate)
	}

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CorsAllowedOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- Publiczne Trasy ---
	r.POST("/addUser", func(c *gin.Context) {
		var json struct {
			Username string `json:"username" binding:"required,min=3"`
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required,min=6"`
		}
		if err := c.ShouldBindJSON(&json); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(json.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Error hashing password: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
			return
		}
		user := User{Username: json.Username, Email: json.Email, Password: string(hashedPassword), CreatedAt: time.Now()}
		if err := db.Create(&user).Error; err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				errorMessage := "Username or email already exists."
				if strings.Contains(err.Error(), "User.username") {
					errorMessage = "Username already exists."
				} else if strings.Contains(err.Error(), "User.email") {
					errorMessage = "Email already exists."
				}
				c.JSON(http.StatusConflict, gin.H{"error": errorMessage})
				return
			}
			log.Printf("Error creating user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add user"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "User added successfully"})
	})

	r.POST("/login", func(c *gin.Context) {
		var json struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&json); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
			return
		}
		var user User
		if err := db.Where("email = ?", json.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			} else {
				log.Printf("Error finding user: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error processing login"})
			}
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(json.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id":  user.ID,
			"username": user.Username,
			"email":    user.Email,
			"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(),
		})
		tokenString, err := token.SignedString(cfg.JWTSecret)
		if err != nil {
			log.Printf("Error signing token: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Login successful", "token": tokenString})
	})

	// --- Chronione Trasy ---
	protected := r.Group("/")
	protected.Use(jwtMiddleware(cfg.JWTSecret))
	{
		protected.GET("/home", func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			username, _ := c.Get("username")
			c.JSON(http.StatusOK, gin.H{
				"message":  fmt.Sprintf("This is your protected data, %s!", username),
				"username": username,
				"user_id":  userID,
			})
		})

		// Nowy endpoint do tworzenia serwerów
		protected.POST("/api/servers", createServerHandler)
		protected.GET("/api/servers", getServersForUserHandler)
		protected.GET("/api/channels", getChannelsHandler)
		protected.GET("/api/servers/:serverId/channels", getChannelsForServerHandler)
		protected.GET("/api/channels/:channelId", getChannelDetailsHandler)
		protected.GET("/api/channels/:channelId/messages", getMessagesForChannelHandler)
		protected.POST("/api/channels/:channelId/messages", postMessageHandler)
		// protected.POST("/api/servers/:serverId/join", joinServerHandler) // (bardziej zaawansowane)
		// protected.POST("/api/servers/:serverId/channels", createChannelHandler)
		// protected.GET("/api/servers/:serverId/channels/:channelId/messages", getMessagesHandler)
		// protected.POST("/api/servers/:serverId/channels/:channelId/messages", postMessageHandler)
	}

	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
