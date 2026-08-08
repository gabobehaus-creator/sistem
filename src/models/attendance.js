const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Attendance = sequelize.define('Attendance', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // Nombre de la tabla de usuarios
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        action_type: {
            type: DataTypes.ENUM('IN', 'OUT'),
            allowNull: false,
        },
        device: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'MOBILE', // O 'WEB' si también se permite desde la web
        },
    }, {
        tableName: 'attendances',
        timestamps: false, // No usamos createdAt/updatedAt para este modelo
        indexes: [
            {
                fields: ['user_id', 'timestamp']
            }
        ]
    });

    // Definir asociaciones si es necesario
    Attendance.associate = (models) => {
        Attendance.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return Attendance;
};
