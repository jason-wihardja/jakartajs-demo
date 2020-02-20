'use strict';

module.exports = (DBContext, DataTypes) => {
    const Participants = DBContext.define('Participants', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        uuid: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'participants',
        freezeTableName: true,
        underscored: true
    });

    Participants.associate = (models) => {
        Participants.belongsTo(models.Events, {
            foreignKey: 'event_id'
        });
    };

    return Participants;
};
